import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Database, Activity, GitCommit, Layers, Plus, Settings } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import type { MLModel } from '../ml/types'

interface Props {
  model: MLModel | undefined
  onBack: () => void
  onUpdateModel: (updated: MLModel) => void
}

export function ModelAnalyticsPage({ model, onBack, onUpdateModel }: Props) {
  // Generate some dummy initial data based on the model
  const dataLength = 20
  const [chartData, setChartData] = useState(() => {
    return Array.from({ length: dataLength }).map((_, i) => ({
      name: `T-${dataLength - i}`,
      val1: Math.floor(Math.random() * 100) + 20,
      val2: Math.floor(Math.random() * 80) + 10,
      val3: Math.floor(Math.random() * 50) + 5
    }))
  })

  const [activeXAxis, setActiveXAxis] = useState<'time' | 'index'>('time')
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
  const [newColName, setNewColName] = useState('')

  if (!model) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-full bg-slate-950">
        <Database className="w-12 h-12 mb-4 opacity-20" />
        <p>No Model Selected.</p>
        <button onClick={onBack} className="mt-4 text-violet-400 text-sm hover:underline">Back to ML Hub</button>
      </div>
    )
  }

  const variables = model.variables || ['Age', 'Income', 'Location', 'Transaction Amount']

  const handleAddColumn = () => {
    if (!newColName.trim()) return
    const updatedVars = [...variables, newColName]
    onUpdateModel({ ...model, variables: updatedVars })
    setNewColName('')
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-50 relative overflow-y-auto">
      {/* Background Gradients */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <header className="flex-none p-6 pb-4 border-b border-white/10 z-10 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Dataset Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">{model.name} &bull; Algorithm: {model.algorithm || 'Auto-selected'}</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 z-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Properties & Editing */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
               <Layers className="w-4 h-4 text-violet-400" /> Dataset Variables
            </h3>
            
            <div className="flex flex-col gap-2 mb-4">
              {variables.map((v, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-2 px-3 text-sm text-slate-300 flex justify-between items-center">
                  <span>{v}</span>
                  <Activity className="w-3 h-3 text-slate-500" />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="New Feature..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <button 
                onClick={handleAddColumn}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-2 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
               <Settings className="w-4 h-4 text-violet-400" /> Graph Controls
            </h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">X-Axis Base</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveXAxis('time')}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${activeXAxis === 'time' ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'}`}
                  >
                    Time (T)
                  </button>
                  <button 
                    onClick={() => setActiveXAxis('index')}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${activeXAxis === 'index' ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'}`}
                  >
                    Row Index
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Visualization</label>
                 <select 
                   value={chartType}
                   onChange={e => setChartType(e.target.value as any)}
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                 >
                   <option value="area">Area Map</option>
                   <option value="line">Line Trend</option>
                   <option value="bar">Bar Distribution</option>
                 </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Graphs */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex-1 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-violet-400" /> Data Distribution Visualizer
              </h2>
            </div>
            
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVal1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorVal2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Area type="monotone" dataKey="val1" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVal1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="val2" stroke="#d946ef" fillOpacity={1} fill="url(#colorVal2)" strokeWidth={2} />
                  </AreaChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Line type="monotone" dataKey="val1" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="val2" stroke="#d946ef" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="val3" stroke="#06b6d4" strokeWidth={3} dot={false} />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="val1" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="val2" fill="#d946ef" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
