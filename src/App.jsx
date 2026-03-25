import React, { useState, useEffect, useMemo } from 'react';
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
  Leaf
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
  const [loading, setLoading] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' }); // { type: 'success' | 'error', text: '' }
  
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

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('surveys-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'surveys' }, (payload) => {
        setSurveys((prev) => [payload.new, ...prev]);
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
      // Clear message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
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
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
              <Zap className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              FoodSystem Hub
            </span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => { setView('survey'); setMessage({ type: '', text: '' }); }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                view === 'survey' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Submit Survey</span>
            </button>
            <button
              onClick={() => { setView('dashboard'); setMessage({ type: '', text: '' }); }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                view === 'dashboard' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Manager Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-blue-100">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Alerts */}
        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300 border ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {view === 'survey' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12">
              <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-6">
                  <ClipboardList className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Food System Survey</h2>
                <p className="text-slate-500 mt-2 text-lg">Your feedback helps us build a more sustainable food future.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="col-span-2">
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <UserCircle className="w-4 h-4 text-blue-500" />
                      <span>Full Name <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none bg-slate-50/50 hover:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>Respondent Type</span>
                    </label>
                    <select
                      name="respondent_type"
                      value={formData.respondent_type}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer"
                    >
                      {RESPONDENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>Region</span>
                    </label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer"
                    >
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Age (Optional)</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="e.g. 28"
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <ShoppingBag className="w-4 h-4 text-blue-500" />
                      <span>Purchase Frequency</span>
                    </label>
                    <select
                      name="purchase_frequency"
                      value={formData.purchase_frequency}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer"
                    >
                      {PURCHASE_FREQUENCIES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <Smile className="w-4 h-4 text-blue-500" />
                      <span>Satisfaction (1-5)</span>
                    </label>
                    <input
                      type="range" min="1" max="5"
                      name="satisfaction_score"
                      value={formData.satisfaction_score}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-1 uppercase tracking-wider">
                      <span>Low</span>
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm">Value: {formData.satisfaction_score}</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mb-2.5">
                      <Star className="w-4 h-4 text-blue-500" />
                      <span>Quality Rating</span>
                    </label>
                    <select
                      name="quality_rating"
                      value={formData.quality_rating}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer"
                    >
                      {RATINGS.map(r => (
                        <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          name="organic_preference"
                          checked={formData.organic_preference}
                          onChange={handleInputChange}
                          className="w-6 h-6 text-emerald-600 rounded-lg border-2 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">Organic Preference</p>
                        <p className="text-xs text-slate-400 group-hover:text-emerald-600 transition-colors">I prefer buying organic food options when available</p>
                      </div>
                      <Leaf className="ml-auto w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:rotate-12 transition-all" />
                    </label>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.25rem] shadow-xl shadow-blue-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span className="text-lg">Submit Response</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <Filter className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Dashboard Filters</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Real-time Analytics</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col min-w-[160px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Region</span>
                    <select
                      value={filters.region}
                      onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50/50 font-bold text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Regions</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col min-w-[180px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Respondent Type</span>
                    <select
                      value={filters.respondent_type}
                      onChange={(e) => setFilters(prev => ({ ...prev, respondent_type: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50/50 font-bold text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Types</option>
                      {RESPONDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="flex items-end h-full pt-5">
                    <button
                      onClick={clearFilters}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
                    >
                      <X className="w-4 h-4" />
                      <span>Clear</span>
                    </button>
                    <button
                      onClick={fetchSurveys}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all ml-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export Filtered</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Responses', value: filteredSurveys.length, icon: Users, color: 'blue' },
                { label: 'Avg Satisfaction', value: `${avgSatisfaction}/5`, icon: Smile, color: 'indigo' },
                { label: 'Avg Quality', value: `${avgQuality}/5`, icon: Star, color: 'amber' },
                { label: 'Organic Pref.', value: `${organicPercentage}%`, icon: Leaf, color: 'emerald' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col justify-between group hover:border-blue-200 transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-${stat.color}-50 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pie Chart: Respondent Type */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                <h3 className="text-lg font-black text-slate-900 mb-8">Respondent Breakdown</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getRespondentData()}
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {getRespondentData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Regional Submissions */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 lg:col-span-2">
                <h3 className="text-lg font-black text-slate-900 mb-8">Regional Distribution</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getRegionData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontWeight: 600, fontSize: 12}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontWeight: 600, fontSize: 12}}
                      />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6" 
                        radius={[8, 8, 0, 0]} 
                        barSize={45}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart: Organic vs Non-Organic */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                <h3 className="text-lg font-black text-slate-900 mb-2">Organic Preference</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Consumer Choices</p>
                <div className="h-[260px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getOrganicData()}
                        innerRadius={80}
                        outerRadius={100}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                        {getOrganicData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-emerald-600">{organicPercentage}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organic</span>
                  </div>
                </div>
              </div>

              {/* Recent Table */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden lg:col-span-2">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900">Recent Activity</h3>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">
                    Showing {Math.min(filteredSurveys.length, 5)} of {filteredSurveys.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.15em]">
                      <tr>
                        <th className="px-8 py-5">Respondent</th>
                        <th className="px-8 py-5">Region</th>
                        <th className="px-8 py-5 text-center">Satisfaction</th>
                        <th className="px-8 py-5 text-center">Quality</th>
                        <th className="px-8 py-5 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredSurveys.slice(0, 5).map((s) => (
                        <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{s.name}</span>
                              <span className="text-xs text-slate-400 font-medium">{s.respondent_type}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                              <MapPin className="w-3 h-3" />
                              <span>{s.region}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < s.satisfaction_score ? 'text-blue-500 fill-blue-500' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center space-x-1">
                              <span className="font-black text-slate-900">{s.quality_rating}</span>
                              <span className="text-slate-300 font-bold">/ 5</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="text-sm font-bold text-slate-400">
                              {new Date(s.survey_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredSurveys.length === 0 && (
                    <div className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-50 rounded-xl mb-4 text-slate-300">
                        <Filter className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 font-bold">No results found for these filters</p>
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
