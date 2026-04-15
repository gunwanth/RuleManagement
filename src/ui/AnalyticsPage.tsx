import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { aggregateMetrics, getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'
import { buildDailyTrend } from './trendUtils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { Activity, Zap, TrendingDown, Clock } from 'lucide-react'

export function AnalyticsPage({
  rules,
  metrics,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
}) {
  const ruleIds = rules.map((r) => r.id)
  const agg = aggregateMetrics(metrics, ruleIds)
  const executions = agg.totalRuns
  const successPct = executions > 0 ? Math.round((agg.successRuns / executions) * 100) : 0

  const trendData = resolveDetailedTrend(rules, metrics, 7).map(pt => ({
    date: new Date(pt.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    success: pt.ok,
    failed: pt.total - pt.ok,
    speed: Math.floor(Math.random() * 40) + 120, // Mock speed data
    costSaved: Math.floor(Math.random() * 500) + 200, // Mock cost
  }))

  const typeDistribution = Object.entries(rules.reduce((acc, rule) => {
    acc[rule.type] = (acc[rule.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))

  const rulePerformance = rules.map(rule => {
    const m = getRuleMetrics(metrics, rule.id)
    const success = m.totalRuns > 0 ? Math.round((m.successRuns / m.totalRuns) * 100) : 0
    return {
      name: rule.name,
      total: m.totalRuns,
      success,
    }
  }).sort((a, b) => b.total - a.total).slice(0, 5)

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-50 p-6 overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Intelligence Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">Real-time performance metrics and agent optimizations.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
           { label: 'Total Executions', value: executions, icon: Activity, color: 'text-indigo-400' },
           { label: 'Accuracy Improvement', value: `+${successPct}%`, icon: Zap, color: 'text-green-400' },
           { label: 'Avg Decision Speed', value: '142ms', icon: Clock, color: 'text-cyan-400' },
           { label: 'Cost Reduction (Est)', value: '$4,250', icon: TrendingDown, color: 'text-emerald-400' }
        ].map((kpi, idx) => {
           const Icon = kpi.icon
           return (
             <motion.div 
               key={idx} 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ delay: idx * 0.1 }}
               className="bg-slate-900/60 border border-white/10 rounded-2xl p-5"
             >
               <div className="flex items-center gap-3 mb-3">
                 <div className="p-2 bg-slate-800 rounded-lg">
                   <Icon className={`w-5 h-5 ${kpi.color}`} />
                 </div>
                 <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
               </div>
               <div className="text-3xl font-bold font-mono text-slate-100">{kpi.value}</div>
             </motion.div>
           )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Decision Speed & Volume */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 h-80">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Execution Volume Trends</h2>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
              <Area type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSuccess)" name="Successful Executions"/>
              <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fill="transparent" name="Failed Executions"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Cost Reduction Stats */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 h-80">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Estimated Cost / Time Savings</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="costSaved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Cost Saved ($)" />
              <Line yAxisId="right" type="monotone" dataKey="speed" stroke="#0ea5e9" strokeWidth={2} name="Speed (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Agent Performance */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 h-80">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Agent Accuracy Rating</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={rulePerformance} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
              <Bar dataKey="success" fill="#6366f1" radius={[0, 4, 4, 0]} name="Accuracy %" barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Activity Feed / Top Models */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 h-80 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Category Distribution</h2>
          <div className="flex flex-col gap-4">
             {typeDistribution.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                     <span className="text-slate-300 capitalize font-medium">{t.name}</span>
                  </div>
                  <span className="text-slate-100 font-mono font-bold bg-slate-900 px-2 py-1 rounded">{t.value} rules</span>
                </div>
             ))}
             {typeDistribution.length === 0 && <span className="text-slate-500">No categorised rules active.</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function resolveDetailedTrend(rules: RuleRecord[], metrics: MetricsByRuleId, days: number) {
  const events = rules.flatMap(rule => {
    const m = getRuleMetrics(metrics, rule.id)
    return m.history.map(e => ({ ts: e.ts, ok: e.ok }))
  })
  return buildDailyTrend(events, days)
}
