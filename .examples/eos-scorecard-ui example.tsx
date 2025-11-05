import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, ChevronRight, X, Edit2, LayoutList, Table, MessageSquare } from 'lucide-react';

const EOSScorecard = () => {
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedWeekForNote, setSelectedWeekForNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [newValue, setNewValue] = useState('');
  const [metrics, setMetrics] = useState([
    {
      id: 1,
      name: 'Revenue',
      owner: 'Brian',
      goal: 100000,
      unit: '$',
      weeks: [
        { date: '2025-09-02', value: 95000, note: '' },
        { date: '2025-09-09', value: 98000, note: '' },
        { date: '2025-09-16', value: 102000, note: '' },
        { date: '2025-09-23', value: 105000, note: 'Launched new campaign' },
        { date: '2025-09-30', value: 103000, note: '' },
        { date: '2025-10-07', value: 107000, note: '' },
        { date: '2025-10-14', value: 110000, note: '' },
        { date: '2025-10-21', value: 108000, note: 'Client churn affected results' },
      ],
      direction: 'higher'
    },
    {
      id: 2,
      name: 'Client Retention Rate',
      owner: 'Sarah',
      goal: 95,
      unit: '%',
      weeks: [
        { date: '2025-09-02', value: 94, note: '' },
        { date: '2025-09-09', value: 95, note: '' },
        { date: '2025-09-16', value: 96, note: '' },
        { date: '2025-09-23', value: 95, note: '' },
        { date: '2025-09-30', value: 93, note: 'Two clients left for budget reasons' },
        { date: '2025-10-07', value: 94, note: '' },
        { date: '2025-10-14', value: 96, note: '' },
        { date: '2025-10-21', value: 97, note: '' },
      ],
      direction: 'higher'
    },
    {
      id: 3,
      name: 'New Leads',
      owner: 'Mike',
      goal: 20,
      unit: '',
      weeks: [
        { date: '2025-09-02', value: 18, note: '' },
        { date: '2025-09-09', value: 22, note: '' },
        { date: '2025-09-16', value: 25, note: '' },
        { date: '2025-09-23', value: 19, note: '' },
        { date: '2025-09-30', value: 21, note: '' },
        { date: '2025-10-07', value: 23, note: '' },
        { date: '2025-10-14', value: 20, note: '' },
        { date: '2025-10-21', value: 24, note: '' },
      ],
      direction: 'higher'
    },
    {
      id: 4,
      name: 'Customer Satisfaction',
      owner: 'Lisa',
      goal: 4.5,
      unit: '/5',
      weeks: [
        { date: '2025-09-02', value: 4.3, note: '' },
        { date: '2025-09-09', value: 4.6, note: '' },
        { date: '2025-09-16', value: 4.7, note: '' },
        { date: '2025-09-23', value: 4.5, note: '' },
        { date: '2025-09-30', value: 4.4, note: '' },
        { date: '2025-10-07', value: 4.6, note: '' },
        { date: '2025-10-14', value: 4.8, note: '' },
        { date: '2025-10-21', value: 4.7, note: '' },
      ],
      direction: 'higher'
    },
    {
      id: 5,
      name: 'Response Time',
      owner: 'Tom',
      goal: 2,
      unit: 'hrs',
      weeks: [
        { date: '2025-09-02', value: 2.5, note: '' },
        { date: '2025-09-09', value: 2.3, note: '' },
        { date: '2025-09-16', value: 1.8, note: '' },
        { date: '2025-09-23', value: 2.1, note: '' },
        { date: '2025-09-30', value: 2.4, note: '' },
        { date: '2025-10-07', value: 1.9, note: '' },
        { date: '2025-10-14', value: 1.7, note: '' },
        { date: '2025-10-21', value: 1.6, note: '' },
      ],
      direction: 'lower'
    }
  ]);

  const getStatus = (value, goal, direction) => {
    const ratio = value / goal;
    if (direction === 'higher') {
      if (ratio >= 1) return 'green';
      if (ratio >= 0.9) return 'yellow';
      return 'red';
    } else {
      if (ratio <= 1) return 'green';
      if (ratio <= 1.1) return 'yellow';
      return 'red';
    }
  };

  const getTrend = (weeks) => {
    if (weeks.length < 2) return 'flat';
    const values = weeks.map(w => w.value);
    const recent = values.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previous = values.slice(-6, -3);
    const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    if (avg > prevAvg * 1.05) return 'up';
    if (avg < prevAvg * 0.95) return 'down';
    return 'flat';
  };

  const getAverage = (weeks) => {
    const values = weeks.map(w => w.value);
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const formatValue = (value, unit) => {
    if (unit === '$') return `$${value.toLocaleString()}`;
    if (unit === '%') return `${value}%`;
    return `${value}${unit}`;
  };

  const formatDateRange = (dateStr) => {
    const date = new Date(dateStr);
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 6);
    
    const startMonth = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `${startMonth} - ${endMonth}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAddValue = () => {
    if (!newValue || !selectedMetric) return;
    
    const updatedMetrics = metrics.map(m => {
      if (m.id === selectedMetric.id) {
        const today = new Date().toISOString().split('T')[0];
        return {
          ...m,
          weeks: [...m.weeks, { date: today, value: parseFloat(newValue), note: '' }]
        };
      }
      return m;
    });
    
    setMetrics(updatedMetrics);
    setNewValue('');
    setShowEntryModal(false);
  };

  const handleAddNote = () => {
    if (!selectedWeekForNote || !selectedMetric) return;
    
    const updatedMetrics = metrics.map(m => {
      if (m.id === selectedMetric.id) {
        return {
          ...m,
          weeks: m.weeks.map(w => 
            w.date === selectedWeekForNote.date 
              ? { ...w, note: noteText }
              : w
          )
        };
      }
      return m;
    });
    
    setMetrics(updatedMetrics);
    setNoteText('');
    setShowNoteModal(false);
    setSelectedWeekForNote(null);
  };

  const openNoteModal = (week, metric) => {
    setSelectedWeekForNote(week);
    setSelectedMetric(metric);
    setNoteText(week.note || '');
    setShowNoteModal(true);
  };

  const StatusDot = ({ status }) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    };
    return <div className={`w-3 h-3 rounded-full ${colors[status]}`} />;
  };

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const MiniChart = ({ weeks, status }) => {
    const values = weeks.map(w => w.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    return (
      <div className="flex items-end gap-0.5 h-8">
        {values.map((value, i) => {
          const height = ((value - min) / range) * 100;
          const colors = {
            green: 'bg-green-400',
            yellow: 'bg-yellow-400',
            red: 'bg-red-400'
          };
          return (
            <div
              key={i}
              className={`flex-1 ${colors[status]} opacity-60 rounded-sm transition-all hover:opacity-100`}
              style={{ height: `${Math.max(height, 10)}%` }}
            />
          );
        })}
      </div>
    );
  };

  const TableView = () => {
    const displayWeeks = [...metrics[0].weeks].slice(-8).reverse();
    
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 min-w-[200px]">
                  Title
                </th>
                <th className="bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 w-12">
                  
                </th>
                <th className="bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 w-24">
                  Goal
                </th>
                <th className="bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 w-24">
                  Average
                </th>
                {displayWeeks.map((week, idx) => (
                  <th key={idx} className="bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 min-w-[90px]">
                    <div>{formatDateRange(week.date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const avg = getAverage(metric.weeks);
                const metricWeeks = [...metric.weeks].slice(-8).reverse();
                
                return (
                  <tr key={metric.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200 group-hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium">
                          {metric.owner.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{metric.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200">
                      <TrendIcon trend={getTrend(metric.weeks)} />
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 text-gray-700">
                      {metric.goal === 0 ? '= 0' : `>= ${formatValue(metric.goal, metric.unit)}`}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 font-medium text-gray-900">
                      {formatValue(avg.toFixed(2), metric.unit)}
                    </td>
                    {metricWeeks.map((week, idx) => {
                      const status = getStatus(week.value, metric.goal, metric.direction);
                      const bgColors = {
                        green: 'bg-green-50',
                        yellow: 'bg-yellow-50',
                        red: 'bg-red-50'
                      };
                      const textColors = {
                        green: 'text-green-900',
                        yellow: 'text-yellow-900',
                        red: 'text-red-900'
                      };
                      
                      return (
                        <td 
                          key={idx} 
                          className={`px-3 py-3 text-center border-r border-gray-200 ${bgColors[status]} ${textColors[status]} font-medium relative group`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {formatValue(week.value, metric.unit)}
                            {week.note && (
                              <MessageSquare className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openNoteModal(week, metric);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 bg-blue-600 bg-opacity-10 flex items-center justify-center transition-opacity"
                          >
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const DetailModal = ({ metric, onClose }) => {
    if (!metric) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{metric.name}</h2>
              <p className="text-sm text-gray-600 mt-1">Owner: {metric.owner} • Goal: {formatValue(metric.goal, metric.unit)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Week over Week</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Week Ending</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">vs Goal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">WoW Change</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...metric.weeks].reverse().map((week, idx) => {
                      const reversedIdx = metric.weeks.length - 1 - idx;
                      const prevWeek = reversedIdx > 0 ? metric.weeks[reversedIdx - 1] : null;
                      const change = prevWeek ? ((week.value - prevWeek.value) / prevWeek.value * 100) : 0;
                      const status = getStatus(week.value, metric.goal, metric.direction);
                      const vsGoal = ((week.value / metric.goal - 1) * 100).toFixed(1);
                      
                      return (
                        <tr key={week.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(week.date)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatValue(week.value, metric.unit)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={vsGoal >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {vsGoal > 0 ? '+' : ''}{vsGoal}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {prevWeek ? (
                              <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {change > 0 ? '+' : ''}{change.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusDot status={status} />
                              <span className="text-sm text-gray-600 capitalize">{status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openNoteModal(week, metric);
                              }}
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {week.note ? 'Edit Note' : 'Add Note'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowEntryModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add This Week's Value
              </button>
            </div>

            {metric.weeks.filter(w => w.note).length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <div className="space-y-3">
                  {[...metric.weeks].reverse().filter(w => w.note).map(week => (
                    <div key={week.date} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{formatDate(week.date)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openNoteModal(week, metric);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700">{week.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const EntryModal = () => {
    if (!showEntryModal || !selectedMetric) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Add Weekly Value</h3>
            <button onClick={() => setShowEntryModal(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Metric: <span className="font-semibold text-gray-900">{selectedMetric.name}</span></p>
            <p className="text-sm text-gray-600">Goal: <span className="font-semibold text-gray-900">{formatValue(selectedMetric.goal, selectedMetric.unit)}</span></p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value for Week of {formatDate(new Date().toISOString())}
            </label>
            <div className="relative">
              {selectedMetric.unit === '$' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              )}
              <input
                type="number"
                step="any"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${selectedMetric.unit === '$' ? 'pl-7' : ''}`}
                placeholder="Enter value"
                autoFocus
              />
              {selectedMetric.unit && selectedMetric.unit !== '$' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{selectedMetric.unit}</span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAddValue}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Save Value
            </button>
            <button
              onClick={() => setShowEntryModal(false)}
              className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NoteModal = () => {
    if (!showNoteModal || !selectedWeekForNote || !selectedMetric) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {selectedWeekForNote.note ? 'Edit Note' : 'Add Note'}
            </h3>
            <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Metric: <span className="font-semibold text-gray-900">{selectedMetric.name}</span></p>
            <p className="text-sm text-gray-600 mb-1">Week: <span className="font-semibold text-gray-900">{formatDate(selectedWeekForNote.date)}</span></p>
            <p className="text-sm text-gray-600">Value: <span className="font-semibold text-gray-900">{formatValue(selectedWeekForNote.value, selectedMetric.unit)}</span></p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add context or explanation for this week's number..."
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAddNote}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Save Note
            </button>
            <button
              onClick={() => setShowNoteModal(false)}
              className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Scorecard</h1>
            <p className="text-gray-600">Week of October 21-27, 2025</p>
          </div>
          
          <div className="flex gap-2 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'cards' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Table className="w-4 h-4" />
              Table View
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <TableView />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Measurable
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Goal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        This Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Trend (8 weeks)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {metrics.map((metric) => {
                      const currentValue = metric.weeks[metric.weeks.length - 1].value;
                      const status = getStatus(currentValue, metric.goal, metric.direction);
                      const trend = getTrend(metric.weeks);
                      
                      return (
                        <tr 
                          key={metric.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedMetric(metric)}
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{metric.name}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{metric.owner}</td>
                          <td className="px-6 py-4 text-gray-600">{formatValue(metric.goal, metric.unit)}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">
                              {formatValue(currentValue, metric.unit)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <StatusDot status={status} />
                              <span className="text-sm text-gray-600 capitalize">{status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <TrendIcon trend={trend} />
                              <div className="w-32">
                                <MiniChart weeks={metric.weeks} status={status} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase">On Track</h3>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.filter(m => getStatus(m.weeks[m.weeks.length - 1].value, m.goal, m.direction) === 'green').length}
                </p>
                <p className="text-sm text-gray-500 mt-1">metrics at or above goal</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase">At Risk</h3>
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.filter(m => getStatus(m.weeks[m.weeks.length - 1].value, m.goal, m.direction) === 'yellow').length}
                </p>
                <p className="text-sm text-gray-500 mt-1">metrics near goal threshold</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase">Off Track</h3>
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.filter(m => getStatus(m.weeks[m.weeks.length - 1].value, m.goal, m.direction) === 'red').length}
                </p>
                <p className="text-sm text-gray-500 mt-1">metrics below goal</p>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex gap-4">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Measurable
          </button>
          <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {selectedMetric && !showEntryModal && !showNoteModal && (
        <DetailModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
      )}
      <EntryModal />
      <NoteModal />
    </div>
  );
};

export default EOSScorecard;