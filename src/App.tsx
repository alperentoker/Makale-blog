import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { INITIAL_ARTICLES, DEMO_SEED_ARTICLES } from './data/mockArticles';
import { Article } from './types';
import { isAuthenticated, logout, fetchSession } from './lib/auth';
import {
  fetchArticles,
  saveArticleApi,
  deleteArticleApi,
  importArticlesApi,
  seedDemoArticlesApi,
  wipeAllArticlesApi,
} from './lib/api';
import { Header } from './components/Header';
import { ReadingProgressBar } from './components/ReadingProgressBar';
import { ArticleList } from './components/ArticleList';
import { ArticleReader } from './components/ArticleReader';
import { AdminLogin } from './components/AdminLogin';
import { NotFoundPage } from './components/NotFoundPage';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const AdminStudio = React.lazy(() => import('./components/AdminStudio').then(m => ({ default: m.AdminStudio })));

// Route component for reading single articles by ID or Slug
interface ArticleReaderPageProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onBackToArchive: () => void;
}

const ArticleReaderPage: React.FC<ArticleReaderPageProps> = ({
  articles,
  onSelectArticle,
  onBackToArchive,
}) => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();

  const article = useMemo(() => {
    if (!idOrSlug) return null;
    const cleanParam = decodeURIComponent(idOrSlug).toLowerCase();
    return articles.find(
      a => a.id.toLowerCase() === cleanParam || (a.slug && a.slug.toLowerCase() === cleanParam)
    ) || null;
  }, [articles, idOrSlug]);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} // LENS`;
    } else {
      document.title = 'Makale Bulunamadı // LENS';
    }
    return () => {
      document.title = 'LENS // Bilgisayarlı Görü & Yapay Zeka Araştırmaları';
    };
  }, [article]);

  if (!article) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto px-4">
        <div className="w-14 h-14 rounded-2xl bg-paper-200 dark:bg-paper-800 text-tactical-amber mx-auto flex items-center justify-center mb-4 border border-paper-300 dark:border-paper-700">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="font-mono text-xs text-tactical-amber uppercase tracking-wider mb-2 font-bold">
          404 // MAKALE BULUNAMADI
        </div>
        <p className="text-base font-serif italic text-ink-600 dark:text-paper-300 mb-6">
          Aradığınız teknik analiz raporu sistemde mevcut değil veya henüz yayınlanmadı.
        </p>
        <button
          onClick={onBackToArchive}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tactical-blue text-white font-mono text-xs font-semibold hover:bg-tactical-blueDark transition-colors shadow-paper-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Arşive Dön</span>
        </button>
      </div>
    );
  }

  return (
    <ArticleReader
      article={article}
      allArticles={articles}
      onSelectArticle={onSelectArticle}
      onBackToArchive={onBackToArchive}
    />
  );
};

// Aliased route redirect: /makale/:idOrSlug -> /article/:idOrSlug
const MakaleRedirect: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  return <Navigate to={`/article/${idOrSlug}`} replace />;
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Articles state initialized with initial articles, then synchronized with server
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lens_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Load articles from server SQLite database
  const refreshArticles = async (adminMode?: boolean) => {
    try {
      const data = await fetchArticles(adminMode ? { status: undefined } : undefined);
      if (Array.isArray(data) && data.length > 0) {
        setArticles(data);
      }
    } catch (e) {
      console.warn('[LENS] Fetching from server failed, using local state:', e);
    }
  };

  useEffect(() => {
    // Initial fetch from server
    fetchSession().then(status => {
      refreshArticles(status.authenticated);
    }).catch(() => {
      refreshArticles(false);
    });
  }, []);

  // Check URL Path, Hash and Keyboard shortcut for hidden admin route
  useEffect(() => {
    const isDirectAdminPath =
      location.pathname === '/admin' ||
      location.pathname === '/studio' ||
      location.pathname === '/yonetim';

    const checkHashRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const isHashAdmin = hash === '#admin' || hash === '#studio' || hash === '#yonetim';

      if (isDirectAdminPath || isHashAdmin) {
        if (isAuthenticated()) {
          setIsAdminOpen(true);
          setIsLoginOpen(false);
        } else {
          setIsLoginOpen(true);
          setIsAdminOpen(false);
        }
      }
    };

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);

    // Keyboard shortcut: Alt + A or Ctrl + Shift + A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'a') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        if (isAuthenticated()) {
          setIsAdminOpen(prev => !prev);
        } else {
          setIsLoginOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', checkHashRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [location.pathname]);

  // Dark mode class toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('lens_dark_mode', String(darkMode));
    } catch (e) {
      console.error('Failed to persist dark mode', e);
    }
  }, [darkMode]);

  const handleSelectArticle = (article: Article) => {
    navigate(`/article/${article.slug || article.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateArchive = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveArticle = async (updatedArticle: Article) => {
    try {
      const saved = await saveArticleApi(updatedArticle);
      setArticles(prev => {
        const idx = prev.findIndex(a => a.id === saved.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
    } catch (e) {
      console.error('Failed to save article on server, updating locally:', e);
      setArticles(prev => {
        const idx = prev.findIndex(a => a.id === updatedArticle.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = updatedArticle;
          return next;
        }
        return [updatedArticle, ...prev];
      });
    }
  };

  const handleDeleteArticle = async (id: string) => {
    const target = articles.find(a => a.id === id);
    try {
      await deleteArticleApi(id);
    } catch (e) {
      console.error('Failed to delete article on server:', e);
    }

    setArticles(prev => prev.filter(a => a.id !== id));

    if (
      target &&
      (location.pathname === `/article/${target.id}` ||
        (target.slug && location.pathname === `/article/${target.slug}`))
    ) {
      navigate('/');
    }
  };

  const handleImportArticles = async (newArticles: Article[]) => {
    try {
      await importArticlesApi(newArticles);
      await refreshArticles(true);
    } catch (e) {
      console.error('Failed to import articles to server:', e);
      setArticles(newArticles);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAdminOpen(false);
    setIsLoginOpen(false);
    await refreshArticles(false); // Reset to public published articles
    if (location.pathname === '/admin' || location.pathname === '/studio' || location.pathname === '/yonetim') {
      navigate('/');
    }
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleLoginSuccess = async () => {
    setIsLoginOpen(false);
    setIsAdminOpen(true);
    await refreshArticles(true); // Load drafts for authenticated admin
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
    if (location.pathname === '/admin' || location.pathname === '/studio' || location.pathname === '/yonetim') {
      navigate('/');
    }
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (location.pathname === '/admin' || location.pathname === '/studio' || location.pathname === '/yonetim') {
      navigate('/');
    }
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      await seedDemoArticlesApi();
      await refreshArticles(true);
    } catch (e) {
      console.error('Failed to seed demo data on server:', e);
      setArticles(DEMO_SEED_ARTICLES);
    }
  };

  const handleWipeAllArticles = async () => {
    try {
      await wipeAllArticlesApi();
    } catch (e) {
      console.error('Failed to wipe articles on server:', e);
    }
    setArticles([]);
    navigate('/');
  };

  const isArticleView =
    location.pathname.startsWith('/article') || location.pathname.startsWith('/makale');

  return (
    <div className="min-h-screen bg-paper-100 dark:bg-paper-900 text-ink-900 dark:text-paper-100 selection:bg-tactical-800 selection:text-white flex flex-col font-sans transition-colors duration-150">
      {/* Top Reading Progress Bar */}
      <ReadingProgressBar />

      {/* Main Header (Clean Public View - No Admin Buttons) */}
      <Header
        currentView={isArticleView ? 'article' : 'archive'}
        onNavigateArchive={handleNavigateArchive}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* View Content (Routed via React Router) */}
      <main className="flex-1">
        <Routes>
          {/* Archive / Home Route */}
          <Route
            path="/"
            element={
              <ArticleList
                articles={articles}
                onSelectArticle={handleSelectArticle}
              />
            }
          />
          <Route path="/archive" element={<Navigate to="/" replace />} />
          <Route path="/arsiv" element={<Navigate to="/" replace />} />

          {/* Single Article Reader Route */}
          <Route
            path="/article/:idOrSlug"
            element={
              <ArticleReaderPage
                articles={articles}
                onSelectArticle={handleSelectArticle}
                onBackToArchive={handleNavigateArchive}
              />
            }
          />

          {/* Turkish URL alias route: /makale/:idOrSlug -> /article/:idOrSlug */}
          <Route
            path="/makale/:idOrSlug"
            element={<MakaleRedirect />}
          />

          {/* Direct Admin Route (renders archive under overlay) */}
          <Route
            path="/admin"
            element={
              <ArticleList
                articles={articles}
                onSelectArticle={handleSelectArticle}
              />
            }
          />
          <Route path="/studio" element={<Navigate to="/admin" replace />} />
          <Route path="/yonetim" element={<Navigate to="/admin" replace />} />

          {/* 404 Catch-All Route */}
          <Route
            path="*"
            element={<NotFoundPage onBackToArchive={handleNavigateArchive} />}
          />
        </Routes>
      </main>

      {/* Admin Authentication Login Modal */}
      <AdminLogin
        isOpen={isLoginOpen}
        onSuccess={handleLoginSuccess}
        onClose={handleCloseLogin}
      />

      {/* Admin Studio Overlay (Protected by Auth, Lazy Loaded) */}
      {isAdminOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 backdrop-blur-md">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-tactical-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="font-mono text-xs text-paper-100">Stüdyo Yükleniyor...</div>
            </div>
          </div>
        }>
          <AdminStudio
            articles={articles}
            onSaveArticle={handleSaveArticle}
            onDeleteArticle={handleDeleteArticle}
            onClose={handleCloseAdmin}
            onPreviewArticle={art => {
              handleSaveArticle(art);
              handleSelectArticle(art);
              setIsAdminOpen(false);
            }}
            onImportArticles={handleImportArticles}
            onLogout={handleLogout}
            onSeedDemoData={handleSeedDemoData}
            onWipeAllArticles={handleWipeAllArticles}
          />
        </Suspense>
      )}

      {/* Swiss Editorial Footer */}
      <footer className="border-t border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 py-10 px-4 text-xs font-mono text-ink-500">
        <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-ink-950 dark:text-paper-100 text-sm">LENS</span>
            <span>—</span>
            <span>Alperen Toker</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Yapay Zeka & Bilgisayarlı Görü</span>
            <span>·</span>
            {/* Discreet admin portal trigger for authorized users only */}
            <button
              onClick={() => {
                if (isAuthenticated()) {
                  setIsAdminOpen(true);
                } else {
                  setIsLoginOpen(true);
                }
              }}
              className="text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 transition-colors flex items-center gap-1 opacity-40 hover:opacity-100"
              title="Yönetici Girişi (Alt+A veya /#admin)"
            >
              <span className="text-[10px]">Konsol</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
