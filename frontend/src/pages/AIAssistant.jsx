import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { advisorAPI } from '../api/advisor.js';
import { ProductCard } from '../components/ProductCard.jsx';
import { ListChecks, Cpu, Laptop, Film, Briefcase, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const USAGE_OPTIONS = [
  { value: 'gaming', label: 'Gaming', icon: Cpu, description: 'High-performance gaming rigs' },
  { value: 'programming', label: 'Programming', icon: Laptop, description: 'Development workstations' },
  { value: 'video-editing', label: 'Video Editing', icon: Film, description: 'Content creation builds' },
  { value: 'office-work', label: 'Office Work', icon: Briefcase, description: 'Productivity and office tasks' },
];

const CATEGORY_LABELS = {
  CPU: 'CPU',
  motherboard: 'Motherboard',
  GPU: 'Graphics card',
  RAM: 'Memory',
  storage: 'Storage',
  PSU: 'Power supply',
  case: 'PC case',
};

function categoryLabels(categories = []) {
  return categories.map((category) => CATEGORY_LABELS[category] || category).join(', ');
}

export function AIAssistant() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [budget, setBudget] = useState('');
  const [usage, setUsage] = useState('gaming');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiUnavailable, setAIUnavailable] = useState(false);

  const selectedUsage = USAGE_OPTIONS.find((option) => option.value === usage);

  const fetchRecommendation = async () => {
    if (!isOnline || loading) return;
    if (!isAuthenticated) {
      setError('Please log in first to use the advisor.');
      return;
    }

    const budgetValue = parseInt(budget, 10);
    if (!budget || !Number.isFinite(budgetValue) || budgetValue <= 0) {
      setError('Enter a budget greater than zero.');
      return;
    }

    setLoading(true);
    setError(null);
    setAIUnavailable(false);
    setRecommendations(null);

    try {
      const data = await advisorAPI.recommend({ budget: budgetValue, usage });
      setRecommendations(data);
    } catch (err) {
      if (err.status === 503 || err.code === 'SERVICE_UNAVAILABLE') {
        setAIUnavailable(true);
      } else if (err.status === 401) {
        setError('Your session expired. Please log in again.');
      } else {
        setError(err.message || 'Could not get a recommendation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = (event) => {
    event.preventDefault();
    fetchRecommendation();
  };

  if (!isAuthenticated) return null;

  const components = Object.values(recommendations?.components || {}).filter(Boolean);
  const warnings = recommendations?.compatibility?.warnings || [];
  const shortfall = Number(recommendations?.shortfall) || 0;

  return (
    <div className="page container">
      <div className="page-header mb-6">
        <h1 className="page-title">AI Assistant</h1>
        <p className="page-subtitle">
          Pick a budget and intended use. The advisor returns a compatible parts list from the catalog.
        </p>
      </div>

      {aiUnavailable && (
        <div className="mb-6 p-6 bg-yellow-50 border border-yellow-100 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle size={20} className="text-warning mt-0.5" />
            <div>
              <h3 className="font-medium text-warning mb-1">Advisor unavailable</h3>
              <p className="text-sm text-text-muted">
                The AI service did not respond. Try again, or browse the catalog and build the PC yourself.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchRecommendation}
              disabled={loading || !isOnline}
              className="btn btn-primary"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="btn btn-ghost"
            >
              Browse products
            </button>
          </div>
        </div>
      )}

      {!aiUnavailable && !recommendations && (
        <form onSubmit={handleRecommend} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
              {error}
            </div>
          )}
          <div className="p-6 bg-surface border border-border rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-primary mb-4">Build configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label" htmlFor="ai-budget">Budget (PHP)</label>
                <input
                  id="ai-budget"
                  type="number"
                  className="form-input"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="e.g. 50000"
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <span className="form-label">Intended usage</span>
                <div className="space-y-2">
                  {USAGE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                          usage === option.value
                            ? 'bg-accent/5 border-accent text-accent'
                            : 'border-border hover:bg-background text-text'
                        }`}
                      >
                        <input
                          type="radio"
                          name="usage"
                          value={option.value}
                          checked={usage === option.value}
                          onChange={() => setUsage(option.value)}
                          className="accent-accent"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-text">{option.label}</div>
                          <div className="text-xs text-text-muted">{option.description}</div>
                        </div>
                        <Icon size={20} className="opacity-50" />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isOnline || !budget}
            className={`btn btn-primary btn-lg w-full ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="animate-spin mr-2" />
                Getting recommendations…
              </>
            ) : (
              <>
                <ListChecks size={20} className="mr-2" />
                Get recommendations
              </>
            )}
          </button>
          {!isOnline && (
            <p className="text-sm text-warning text-center mt-2">
              You are offline. The advisor needs a connection.
            </p>
          )}
        </form>
      )}

      {recommendations && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-primary">Recommended build</h2>
              <p className="text-sm text-text-muted">
                For a ₱{Number(budget).toLocaleString()} budget and {selectedUsage?.label.toLowerCase() || usage} use.
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              recommendations.source === 'ai'
                ? 'bg-green-50 border-green-100'
                : 'bg-background border-border'
            }`}>
              <CheckCircle size={16} className={recommendations.source === 'ai' ? 'text-success' : 'text-text-muted'} />
              <span className={`text-xs font-medium ${
                recommendations.source === 'ai' ? 'text-success' : 'text-text-muted'
              }`}>
                {recommendations.source === 'ai' ? 'AI-assisted' : 'Catalog-based'}
              </span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-text">Estimated total</span>
              <span className="text-lg font-bold text-primary">
                ₱{Number(recommendations.estimatedPrice || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${recommendations.compatibility?.compatible ? 'text-success' : 'text-warning'}`}>
                {recommendations.compatibility?.compatible ? 'Compatible build' : 'Compatibility warnings'}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-2">
              {recommendations.explanation || 'A compatible parts list from the catalog.'}
            </p>
          </div>

          {recommendations.partial && (
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <h3 className="text-sm font-semibold text-warning mb-2">Partial build</h3>
              <p className="text-sm text-text-muted">
                {shortfall > 0 && recommendations.minimumBudget != null
                  ? `A complete build needs at least ₱${Number(recommendations.minimumBudget).toLocaleString()}. This selection is ₱${shortfall.toLocaleString()} short of the full set.`
                  : 'Some required parts are out of stock, so this selection is incomplete.'}
              </p>
              {recommendations.omittedCategories?.length > 0 && (
                <p className="text-sm text-text-muted mt-2">
                  Missing: {categoryLabels(recommendations.omittedCategories)}.
                </p>
              )}
              {recommendations.unavailableCategories?.length > 0 && (
                <p className="text-sm text-text-muted mt-2">
                  Out of stock: {categoryLabels(recommendations.unavailableCategories)}.
                </p>
              )}
            </div>
          )}

          {components.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {components.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              No parts matched this budget. Raise the budget or browse the catalog.
            </p>
          )}

          {warnings.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <h3 className="text-sm font-semibold text-warning mb-2">Compatibility notes</h3>
              <ul className="text-sm text-text-muted space-y-1">
                {warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`} className="flex items-start gap-2">
                    <span className="text-xs text-warning">!</span>
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setRecommendations(null);
                setError(null);
              }}
              className="btn btn-ghost"
            >
              Get new recommendations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
