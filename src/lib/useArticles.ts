import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Article } from '../types';
import { INITIAL_ARTICLES } from '../data/mockArticles';
import {
  fetchArticles,
  fetchArticle,
  saveArticleApi,
  deleteArticleApi,
  importArticlesApi,
  seedDemoArticlesApi,
  wipeAllArticlesApi,
} from './api';

export const ARTICLES_QUERY_KEY = 'articles';

export interface UseArticlesOptions {
  adminMode?: boolean;
  category?: string;
  q?: string;
}

// 1. Hook to fetch and cache articles with SQLite FTS5 search and category filters
export function useArticles(optionsOrAdmin: boolean | UseArticlesOptions = false) {
  const options: UseArticlesOptions =
    typeof optionsOrAdmin === 'boolean' ? { adminMode: optionsOrAdmin } : optionsOrAdmin;

  const { adminMode = false, category, q } = options;
  const isFiltered = !!(category && category !== 'Tümü') || !!(q && q.trim());

  return useQuery({
    queryKey: [ARTICLES_QUERY_KEY, { admin: adminMode, category: category || 'all', q: q || '' }],
    queryFn: async () => {
      try {
        const data = await fetchArticles({
          category: category && category !== 'Tümü' ? category : undefined,
          q: q?.trim() || undefined,
          status: adminMode ? undefined : 'published',
        });
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('[LENS] Backend fetchArticles failed, falling back to initial data:', err);
        let fallback = [...INITIAL_ARTICLES];
        if (category && category !== 'Tümü') {
          fallback = fallback.filter(a => a.category === category);
        }
        if (q && q.trim()) {
          const lower = q.toLowerCase();
          fallback = fallback.filter(
            a =>
              a.title.toLowerCase().includes(lower) ||
              a.dek.toLowerCase().includes(lower) ||
              a.tags.some(t => t.toLowerCase().includes(lower))
          );
        }
        return fallback;
      }
    },
    initialData: isFiltered ? undefined : INITIAL_ARTICLES,
    staleTime: 1000 * 60 * 2, // 2 minutes cache freshness
  });
}

// 2. Hook to fetch single article by id or slug
export function useArticle(idOrSlug?: string, cachedArticle?: Article | null) {
  const hasFullContent = !!(cachedArticle?.content && cachedArticle.content.trim());

  return useQuery({
    queryKey: ['article', idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) return null;
      return fetchArticle(idOrSlug);
    },
    enabled: !!idOrSlug && !hasFullContent,
    initialData: hasFullContent ? (cachedArticle as Article) : undefined,
    staleTime: 1000 * 60 * 5,
  });
}

// 3. Hook for saving articles with Optimistic Update & Rollback capability
export function useSaveArticle(adminMode: boolean = false) {
  const queryClient = useQueryClient();
  const queryKey = [ARTICLES_QUERY_KEY, { admin: adminMode }];

  return useMutation({
    mutationFn: (article: Article) => saveArticleApi(article),
    // When mutate is called, optimistically update UI and snapshot previous state
    onMutate: async (newArticle: Article) => {
      await queryClient.cancelQueries({ queryKey: [ARTICLES_QUERY_KEY] });

      const previousArticles = queryClient.getQueryData<Article[]>(queryKey) || [];

      // Optimistically update articles list
      queryClient.setQueryData<Article[]>(queryKey, (old = []) => {
        const idx = old.findIndex(a => a.id === newArticle.id);
        if (idx !== -1) {
          const next = [...old];
          next[idx] = newArticle;
          return next;
        }
        return [newArticle, ...old];
      });

      // Also update single article query if exists
      queryClient.setQueryData(['article', newArticle.slug || newArticle.id], newArticle);

      return { previousArticles };
    },
    // If mutation fails, rollback to previous snapshot!
    onError: (err, _newArticle, context) => {
      if (context?.previousArticles) {
        queryClient.setQueryData(queryKey, context.previousArticles);
      }
      console.error('[LENS Query] Save mutation failed, state rolled back:', err);
    },
    // Always refetch in background after error or success to guarantee synchronization
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
    },
  });
}

// 4. Hook for deleting articles with Optimistic Update & Rollback capability
export function useDeleteArticle(adminMode: boolean = false) {
  const queryClient = useQueryClient();
  const queryKey = [ARTICLES_QUERY_KEY, { admin: adminMode }];

  return useMutation({
    mutationFn: (id: string) => deleteArticleApi(id),
    onMutate: async (idToDelete: string) => {
      await queryClient.cancelQueries({ queryKey: [ARTICLES_QUERY_KEY] });

      const previousArticles = queryClient.getQueryData<Article[]>(queryKey) || [];

      // Optimistically remove article
      queryClient.setQueryData<Article[]>(queryKey, (old = []) =>
        old.filter(a => a.id !== idToDelete)
      );

      return { previousArticles };
    },
    onError: (err, _id, context) => {
      if (context?.previousArticles) {
        queryClient.setQueryData(queryKey, context.previousArticles);
      }
      console.error('[LENS Query] Delete mutation failed, state rolled back:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
    },
  });
}

// 5. Hook for importing articles
export function useImportArticles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (articles: Article[]) => importArticlesApi(articles),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
    },
  });
}

// 6. Hook for seeding demo articles
export function useSeedArticles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => seedDemoArticlesApi(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
    },
  });
}

// 7. Hook for wiping all articles
export function useWipeArticles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => wipeAllArticlesApi(),
    onSettled: () => {
      queryClient.setQueryData([ARTICLES_QUERY_KEY, { admin: true }], []);
      queryClient.setQueryData([ARTICLES_QUERY_KEY, { admin: false }], []);
      queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
    },
  });
}
