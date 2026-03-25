import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  ClipboardList, 
  Send, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  MapPin,
  UserCircle,
  Calendar,
  ShoppingBag,
  Star,
  RefreshCw,
  Filter,
  X,
  Smile,
  Zap,
  Leaf,
  Upload,
  ArrowRight,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Constants ---
const RESPONDENT_TYPES = ['Consumer', 'Farmer', 'Retailer', 'Other'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const PURCHASE_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Rarely'];
const RATINGS = [1, 2, 3, 4, 5];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const DONUT_COLORS = ['#10b981', '#cbd5e1']; // Organic, Non-Organic

function App() {
  const [view, setView] = useState('survey'); // 'survey' or 'dashboard'
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  
  // --- Dashboard Filters ---
  const [filters, setFilters] = useState({
    region: 'All',
    respondent_type: 'All'
  });

  const [formData, setFormData] = useState({
    name: '',
    respondent_type: 'Consumer',
    region: 'North',
    age: '',
    satisfaction_score: 3,
    purchase_frequency: 'Weekly',
    quality_rating: 3,
    organic_preference: false
  });

  // --- Data Fetching & Subscription ---
  useEffect(() => {
    fetchSurveys();

    // Subscribe to all changes (Phase 7: Real-time)
    const subscription = supabase
      .channel('surveys-all-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSurveys((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setSurveys((prev) => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
          setSurveys((prev) => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });
    
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: 'Error fetching data: ' + error.message });
    } else {
      setSurveys(data || []);
    }
  };

  // --- Filtered Data ---
  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const regionMatch = filters.region === 'All' || s.region === filters.region;
      const typeMatch = filters.respondent_type === 'All' || s.respondent_type === filters.respondent_type;
      return regionMatch && typeMatch;
    });
  }, [surveys, filters]);

  // --- Handlers ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('surveys').insert([
      {
        ...formData,
        age: parseInt(formData.age) || null,
        satisfaction_score: parseInt(formData.satisfaction_score),
        quality_rating: parseInt(formData.quality_rating)
      }
    ]);

    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: 'Error submitting survey: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Survey submitted successfully!' });
      setFormData({
        name: '',
        respondent_type: 'Consumer',
        region: 'North',
        age: '',
        satisfaction_score: 3,
        purchase_frequency: 'Weekly',
        quality_rating: 3,
        organic_preference: false
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // --- Phase 5: Excel Import ---
  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processExcelFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processExcelFile(file);
    } else {
      setMessage({ type: 'error', text: 'Please drop a valid Excel file (.xlsx or .xls)' });
    }
  };

  const processExcelFile = (file) => {
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map and validate rows
        const formattedData = data.map(row => ({
          name: row.Name || row.name || 'Imported User',
          respondent_type: RESPONDENT_TYPES.includes(row['Respondent Type'] || row.respondent_type) 
            ? (row['Respondent Type'] || row.respondent_type) : 'Consumer',
          region: REGIONS.includes(row.Region || row.region) 
            ? (row.Region || row.region) : 'North',
          age: parseInt(row.Age || row.age) || null,
          satisfaction_score: Math.min(Math.max(parseInt(row['Satisfaction Score'] || row.satisfaction_score) || 3, 1), 5),
          purchase_frequency: PURCHASE_FREQUENCIES.includes(row['Purchase Frequency'] || row.purchase_frequency) 
            ? (row['Purchase Frequency'] || row.purchase_frequency) : 'Weekly',
          quality_rating: Math.min(Math.max(parseInt(row['Quality Rating'] || row.quality_rating) || 3, 1), 5),
          organic_preference: !!(row['Organic Preference'] || row.organic_preference)
        }));

        const { error } = await supabase.from('surveys').insert(formattedData);

        if (error) throw error;

        setMessage({ type: 'success', text: `Successfully imported ${formattedData.length} records!` });
        fetchSurveys(); // Refresh manually just in case, though real-time should handle it
      } catch (err) {
        setMessage({ type: 'error', text: 'Import failed: ' + err.message });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredSurveys);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Surveys");
    XLSX.writeFile(workbook, "Food_System_Analytics.xlsx");
  };

  const clearFilters = () => {
    setFilters({ region: 'All', respondent_type: 'All' });
  };

  // --- Analytics Processing ---
  const getRespondentData = () => {
    const counts = {};
    filteredSurveys.forEach(s => {
      counts[s.respondent_type] = (counts[s.respondent_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getRegionData = () => {
    const counts = {};
    filteredSurveys.forEach(s => {
      counts[s.region] = (counts[s.region] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getOrganicData = () => {
    const organic = filteredSurveys.filter(s => s.organic_preference).length;
    const nonOrganic = filteredSurveys.length - organic;
    return [
      { name: 'Organic', value: organic },
      { name: 'Non-Organic', value: nonOrganic }
    ];
  };

  const avgSatisfaction = filteredSurveys.length > 0 
    ? (filteredSurveys.reduce((acc, s) => acc + (s.satisfaction_score || 0), 0) / filteredSurveys.length).toFixed(1)
    : '0.0';

  const avgQuality = filteredSurveys.length > 0 
    ? (filteredSurveys.reduce((acc, s) => acc + (s.quality_rating || 0), 0) / filteredSurveys.length).toFixed(1)
    : '0.0';

  const organicPercentage = filteredSurveys.length > 0 
    ? Math.round((filteredSurveys.filter(s => s.organic_preference).length / filteredSurveys.length) * 100)
    : 0;

  // --- Components ---
  const Nav = () => (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setView('survey')}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
              <Zap className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-700 tracking-tight">
              FoodSystem Hub
            </span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-6">
            <div className="hidden md:flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100">
              <button
                onClick={() => setView('survey')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  view === 'survey' 
                    ? 'bg-white text-blue-600 shadow-md border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Survey</span>
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-600 shadow-md border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            </div>

            {/* Import Button with Drag & Drop */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="relative"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelImport} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
              <button
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 group"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                )}
                <span className="hidden sm:inline">Import Excel</span>
              </button>
            </div>

            {/* Mobile Nav */}
            <div className="md:hidden flex items-center space-x-2">
              <button onClick={() => setView('survey')} className={`p-2 rounded-lg ${view === 'survey' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                <ClipboardList className="w-6 h-6" />
              </button>
              <button onClick={() => setView('dashboard')} className={`p-2 rounded-lg ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                <TrendingUp className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 rounded-2xl ${className}`}></div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-blue-100">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Alerts (Phase 8: Polish) */}
        {message.text && (
          <div className={`fixed top-24 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-right-8 duration-500 border-2 ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            <div className={`p-2 rounded-xl ${message.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </div>
            <span className="font-black text-sm">{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {view === 'survey' ? (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-8 md:p-14 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="mb-12 text-center relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl mb-8 shadow-inner">
                  <ClipboardList className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Food System Survey</h2>
                <p className="text-slate-500 text-lg font-medium max-w-md mx-auto leading-relaxed">
                  Join our mission to build a more sustainable and transparent local food ecosystem.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="col-span-2 group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <UserCircle className="w-4 h-4 text-blue-500" />
                      <span>Full Name <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Jane Doe"
                      className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 focus:ring-8 focus:ring-blue-50/30 transition-all outline-none bg-slate-50/50 hover:bg-slate-50 font-bold"
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>Respondent Type</span>
                    </label>
                    <select
                      name="respondent_type"
                      value={formData.respondent_type}
                      onChange={handleInputChange}
                      className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer font-bold"
                    >
                      {RESPONDENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>Region</span>
                    </label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer font-bold"
                    >
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Age (Optional)</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="28"
                      className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 transition-all outline-none bg-slate-50/50 font-bold"
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <ShoppingBag className="w-4 h-4 text-blue-500" />
                      <span>Purchase Frequency</span>
                    </label>
                    <select
                      name="purchase_frequency"
                      value={formData.purchase_frequency}
                      onChange={handleInputChange}
                      className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer font-bold"
                    >
                      {PURCHASE_FREQUENCIES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <Smile className="w-4 h-4 text-blue-500" />
                      <span>Satisfaction (1-5)</span>
                    </label>
                    <div className="bg-slate-50/50 p-6 rounded-2xl border-2 border-slate-50">
                      <input
                        type="range" min="1" max="5"
                        name="satisfaction_score"
                        value={formData.satisfaction_score}
                        onChange={handleInputChange}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between mt-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low</span>
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < formData.satisfaction_score ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High</span>
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1">
                      <Star className="w-4 h-4 text-blue-500" />
                      <span>Quality Rating</span>
                    </label>
                    <select
                      name="quality_rating"
                      value={formData.quality_rating}
                      onChange={handleInputChange}
                      className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer font-bold"
                    >
                      {RATINGS.map(r => (
                        <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center p-6 rounded-[2rem] bg-slate-50/50 border-2 border-slate-50 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all cursor-pointer group shadow-sm">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          name="organic_preference"
                          checked={formData.organic_preference}
                          onChange={handleInputChange}
                          className="w-7 h-7 text-emerald-600 rounded-xl border-2 border-slate-300 focus:ring-emerald-500 cursor-pointer transition-all"
                        />
                      </div>
                      <div className="ml-6">
                        <p className="text-sm font-black text-slate-700 group-hover:text-emerald-700 transition-colors">Organic Preference</p>
                        <p className="text-xs text-slate-400 font-bold group-hover:text-emerald-600 transition-colors">I prefer buying organic food options when available</p>
                      </div>
                      <Leaf className="ml-auto w-6 h-6 text-slate-300 group-hover:text-emerald-500 group-hover:rotate-12 transition-all" />
                    </label>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-6 rounded-3xl shadow-2xl shadow-blue-200 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] flex items-center justify-center space-x-4 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <span className="text-xl">Submit My Response</span>
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">
            {/* Phase 8: Filter Bar with Polish */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-50 p-4 rounded-2xl shadow-inner">
                    <Filter className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Intelligence Filters</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Real-time Global Analytics</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-6">
                  <div className="flex flex-col min-w-[200px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Geographic Region</span>
                    <select
                      value={filters.region}
                      onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                      className="px-5 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50/50 font-bold text-sm focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-slate-50 shadow-sm"
                    >
                      <option value="All">All Regions</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col min-w-[220px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Respondent Segment</span>
                    <select
                      value={filters.respondent_type}
                      onChange={(e) => setFilters(prev => ({ ...prev, respondent_type: e.target.value }))}
                      className="px-5 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50/50 font-bold text-sm focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-slate-50 shadow-sm"
                    >
                      <option value="All">All Segments</option>
                      {RESPONDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearFilters}
                      className="flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-black text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all border-2 border-transparent"
                    >
                      <X className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                    <button
                      onClick={fetchSurveys}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-100 transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 transition-all transform hover:-translate-y-1"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Download Excel</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat Cards with Skeleton support */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)
              ) : (
                [
                  { label: 'Total Responses', value: filteredSurveys.length, icon: Users, color: 'blue' },
                  { label: 'Avg Satisfaction', value: `${avgSatisfaction}/5`, icon: Smile, color: 'indigo' },
                  { label: 'Avg Quality', value: `${avgQuality}/5`, icon: Star, color: 'amber' },
                  { label: 'Organic Preference', value: `${organicPercentage}%`, icon: Leaf, color: 'emerald' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col justify-between group hover:border-blue-400 hover:-translate-y-2 transition-all duration-500">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center mb-8 bg-${stat.color}-50 group-hover:rotate-12 transition-transform`}>
                      <stat.icon className={`w-7 h-7 text-${stat.color}-600`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                      <p className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pie Chart */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                <h3 className="text-xl font-black text-slate-900 mb-10 tracking-tight">Segment Analysis</h3>
                {loading ? <Skeleton className="h-[300px]" /> : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getRespondentData()}
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={10}
                          dataKey="value"
                        >
                          {getRespondentData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bar Chart */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30 lg:col-span-2">
                <h3 className="text-xl font-black text-slate-900 mb-10 tracking-tight">Regional Distribution</h3>
                {loading ? <Skeleton className="h-[300px]" /> : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getRegionData()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontWeight: 800, fontSize: 11}}
                          dy={15}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontWeight: 800, fontSize: 11}}
                        />
                        <Tooltip 
                          cursor={{fill: '#f8fafc', radius: 12}}
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#3b82f6" 
                          radius={[12, 12, 0, 0]} 
                          barSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Donut Chart */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Sustainability</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-10">Organic Market Share</p>
                {loading ? <Skeleton className="h-[280px]" /> : (
                  <div className="h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getOrganicData()}
                          innerRadius={90}
                          outerRadius={115}
                          startAngle={90}
                          endAngle={450}
                          dataKey="value"
                        >
                          {getOrganicData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-5xl font-black text-emerald-600 tracking-tighter">{organicPercentage}%</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Prefer Organic</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Table (Phase 8: Empty States & Polish) */}
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden lg:col-span-2">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-50 p-3 rounded-2xl">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Intelligence Log</h3>
                  </div>
                  <span className="px-5 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
                    {filteredSurveys.length} Total Signals
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                      <tr>
                        <th className="px-10 py-6">Respondent Profile</th>
                        <th className="px-10 py-6">Origin</th>
                        <th className="px-10 py-6 text-center">Satisfaction</th>
                        <th className="px-10 py-6 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i}><td colSpan="4" className="px-10 py-6"><Skeleton className="h-8 w-full" /></td></tr>
                        ))
                      ) : filteredSurveys.slice(0, 10).map((s) => (
                        <tr key={s.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                          <td className="px-10 py-7">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                                {s.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 tracking-tight">{s.name}</span>
                                <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{s.respondent_type}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-7">
                            <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                              <MapPin className="w-3 h-3" />
                              <span>{s.region}</span>
                            </div>
                          </td>
                          <td className="px-10 py-7">
                            <div className="flex items-center justify-center space-x-1.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < s.satisfaction_score ? 'text-amber-400 fill-amber-400' : 'text-slate-100'}`} />
                              ))}
                            </div>
                          </td>
                          <td className="px-10 py-7 text-right">
                            <span className="text-sm font-black text-slate-400 tabular-nums">
                              {new Date(s.survey_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loading && filteredSurveys.length === 0 && (
                    <div className="p-20 text-center animate-in fade-in zoom-in duration-500">
                      <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-50 rounded-[2rem] mb-6 text-slate-200 border-2 border-dashed border-slate-100">
                        <Database className="w-10 h-10" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-2 tracking-tight">No signals detected</h4>
                      <p className="text-slate-400 font-medium max-w-xs mx-auto">Adjust your filters or import historical data to begin analysis.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
