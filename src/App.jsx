import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts'; // Using recharts for better React integration
import { 
  LayoutDashboard, 
  ClipboardList, 
  Send, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Constants ---
const RESPONDENT_TYPES = ['Consumer', 'Farmer', 'Retailer', 'Other'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const PURCHASE_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Rarely'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function App() {
  const [view, setView] = useState('survey'); // 'survey' or 'dashboard'
  const [loading, setLoading] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    respondent_type: 'Consumer',
    region: 'North',
    age: '',
    satisfaction_score: 5,
    purchase_frequency: 'Weekly',
    quality_rating: 5,
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
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching surveys:', error);
    else setSurveys(data || []);
  };

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
      alert('Error submitting survey: ' + error.message);
    } else {
      alert('Survey submitted successfully!');
      setFormData({
        name: '',
        respondent_type: 'Consumer',
        region: 'North',
        age: '',
        satisfaction_score: 5,
        purchase_frequency: 'Weekly',
        quality_rating: 5,
        organic_preference: false
      });
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(surveys);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Surveys");
    XLSX.writeFile(workbook, "Food_System_Surveys.xlsx");
  };

  // --- Analytics Processing ---
  const getRespondentData = () => {
    const counts = {};
    surveys.forEach(s => {
      counts[s.respondent_type] = (counts[s.respondent_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getRegionData = () => {
    const counts = {};
    surveys.forEach(s => {
      counts[s.region] = (counts[s.region] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getAverageScores = () => {
    if (surveys.length === 0) return [];
    const avgSatisfaction = surveys.reduce((acc, s) => acc + (s.satisfaction_score || 0), 0) / surveys.length;
    const avgQuality = surveys.reduce((acc, s) => acc + (s.quality_rating || 0), 0) / surveys.length;
    return [
      { name: 'Satisfaction', score: parseFloat(avgSatisfaction.toFixed(1)) },
      { name: 'Quality', score: parseFloat(avgQuality.toFixed(1)) }
    ];
  };

  // --- Components ---
  const Nav = () => (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-900">FoodSystem Hub</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setView('survey')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'survey' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Submit Survey
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Manager Dashboard
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'survey' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Food System Survey</h2>
                <p className="text-gray-500 mt-1">Your feedback helps us improve local food distribution.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Respondent Type</label>
                    <select
                      name="respondent_type"
                      value={formData.respondent_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    >
                      {RESPONDENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Region</label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    >
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="e.g. 25"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Frequency</label>
                    <select
                      name="purchase_frequency"
                      value={formData.purchase_frequency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    >
                      {PURCHASE_FREQUENCIES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Satisfaction (1-5)</label>
                    <input
                      type="range" min="1" max="5"
                      name="satisfaction_score"
                      value={formData.satisfaction_score}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                      <span>Poor</span>
                      <span>Excellent ({formData.satisfaction_score})</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quality Rating (1-5)</label>
                    <input
                      type="range" min="1" max="5"
                      name="quality_rating"
                      value={formData.quality_rating}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                      <span>Low</span>
                      <span>High ({formData.quality_rating})</span>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      name="organic_preference"
                      checked={formData.organic_preference}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                      I prefer organic food options
                    </label>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Survey</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
                <p className="text-gray-500">Real-time insights from {surveys.length} submissions.</p>
              </div>
              <button 
                onClick={exportToExcel}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all font-semibold"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Export to Excel</span>
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Users className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Respondents</p>
                  <p className="text-2xl font-bold">{surveys.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="bg-emerald-100 p-3 rounded-xl">
                  <TrendingUp className="text-emerald-600 w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Avg Satisfaction</p>
                  <p className="text-2xl font-bold">
                    {surveys.length > 0 
                      ? (surveys.reduce((acc, s) => acc + (s.satisfaction_score || 0), 0) / surveys.length).toFixed(1)
                      : '0.0'} / 5
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="bg-amber-100 p-3 rounded-xl">
                  <CheckCircle2 className="text-amber-600 w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Organic Preference</p>
                  <p className="text-2xl font-bold">
                    {surveys.length > 0 
                      ? Math.round((surveys.filter(s => s.organic_preference).length / surveys.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6">Respondent Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getRespondentData()}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getRespondentData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6">Regional Submissions</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getRegionData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold mb-6">Average Ratings</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={getAverageScores()}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h3 className="text-lg font-bold">Recent Submissions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Region</th>
                      <th className="px-6 py-4">Satisfaction</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {surveys.slice(0, 5).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{s.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold">
                            {s.respondent_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">{s.region}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1">
                            <span className="font-bold text-gray-700">{s.satisfaction_score}</span>
                            <span className="text-gray-400">/ 5</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {new Date(s.survey_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
