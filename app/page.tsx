"use client";
// 导出的代码使用 Tailwind CSS。请在您的开发环境中安装 Tailwind CSS 以确保所有样式正常工作。

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ApiTrendItem = {
  id: number;
  title: string;
  hot?: number | string;
  hotnum?: number;
  hotText?: string;
  growth?: string;
  platform: string;
  description: string;
};

type ProductInfo = {
  name: string;
  type: string;
  audience: string;
  price: string;
  features: string;
};

type Trend = {
  name: string;
  platform: string;
  glowColor: string;
  ringColor: string;
  heat: number;
  hotText: string;
  growth: string;
  description: string;
  tags: string[];
  icon: string;
};

function parseHotToNumber(hot: unknown): number {
  if (typeof hot === 'number') return Number.isFinite(hot) ? hot : 0;
  if (typeof hot !== 'string') return 0;
  const text = hot.trim();
  const wanMatch = text.match(/^(\d+(?:\.\d+)?)\s*万$/);
  if (wanMatch) return Math.round(Number(wanMatch[1]) * 10000);
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fallbackHotnumByRank(index: number) {
  const baseTop = 105000;
  const step = 1800;
  const jitter = randInt(-400, 400);
  const value = baseTop - index * step + jitter;
  return Math.max(5000, value);
}

function formatHeatNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return '0';
  return n.toLocaleString();
}

function formatDeepSeekJson(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as any;

  // 这里是关键修改：增加了对 "初步灵感" 这个中文 Key 的判断
  const ideas = Array.isArray(obj.初步灵感) ? obj.初步灵感 : (Array.isArray(obj.ideas) ? obj.ideas : []);

  if (ideas.length > 0) {
    return ideas
      .slice(0, 6)
      .map((it: any, idx: number) => {
        // 这里的各个字段也对应了 JSON 里的中文名
        const entry = String(it?.切入点 ?? it?.hook ?? it?.point ?? '').trim();
        const copy = String(it?.文案 ?? it?.copy ?? it?.slogan ?? '').trim();
        const brief = String(it?.简述 ?? it?.desc ?? it?.brief ?? '').trim();
        return `#${idx + 1} ${entry || '切入点'}\n- 文案：${copy || '—'}\n- 简述：${brief || '—'}`;
      })
      .join('\n\n');
  }

  // 如果找不到数组，就美化显示
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '解析失败';
  }
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'trending' | 'detail' | 'input' | 'result'>('home');
  const [selectedTrend, setSelectedTrend] = useState<string>('');
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number>(0);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [selectedStrategyTitle, setSelectedStrategyTitle] = useState<string>('');
  const [strategyReminder, setStrategyReminder] = useState<string>('');
  const [isAnalyzingStrategy, setIsAnalyzingStrategy] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, vx: number, vy: number}>>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState<'douyin' | 'xiaohongshu' | null>(null);
  const [currentContentType, setCurrentContentType] = useState<'original' | 'douyin' | 'xiaohongshu'>('original');

  useEffect(() => {
    const initialParticles = Array.from({length: 20}, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    }));
    setParticles(initialParticles);

    const animateParticles = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: (particle.x + particle.vx + window.innerWidth) % window.innerWidth,
        y: (particle.y + particle.vy + window.innerHeight) % window.innerHeight
      })));
    };

    const interval = setInterval(animateParticles, 50);
    return () => clearInterval(interval);
  }, []);

  const ParticleBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 bg-blue-200/40 rounded-full shadow-sm"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            boxShadow: '0 0 6px rgba(59, 130, 246, 0.3)'
          }}
        />
      ))}
    </div>
  );

  const [productInfo, setProductInfo] = useState<ProductInfo>({
    name: '',
    type: '',
    audience: '',
    price: '',
    features: ''
  });

  const [generatedContent, setGeneratedContent] = useState('');
  const [douyinContent, setDouyinContent] = useState('');
  const [xiaohongshuContent, setXiaohongshuContent] = useState('');

  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'ai', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');

  const [trends, setTrends] = useState<Trend[]>([]);

  const [seedIdea, setSeedIdea] = useState<string>('');
  const [isLoadingSeedIdea, setIsLoadingSeedIdea] = useState(false);

  const strategies = [
    {
      id: 'emotion',
      title: '情绪平替',
      subtitle: '关注安全感与确定性',
      reminder: '正在分析社会情绪的最大公约数...',
      icon: 'fa-solid fa-heart'
    },
    {
      id: 'knowledge',
      title: '知识降维',
      subtitle: '拆解“稳”背后的数据',
      reminder: '正在提取专业知识的下沉路线...',
      icon: 'fa-solid fa-book'
    },
    {
      id: 'reverse',
      title: '反向安利',
      subtitle: '制造冲突与决策参考',
      reminder: '正在挖掘反直觉的商业切入点...',
      icon: 'fa-solid fa-rotate-left'
    },
    {
      id: 'lifestyle',
      title: '生活范式',
      subtitle: '描绘具体的理想场景',
      reminder: '正在将宏观叙事转化为小确幸...',
      icon: 'fa-solid fa-house'
    },
    {
      id: 'insight',
      title: '底层逻辑',
      subtitle: '穿透表象的深度洞察',
      reminder: '正在穿透现象，回溯商业本质...',
      icon: 'fa-solid fa-lightbulb'
    },
    {
      id: 'collage',
      title: '暴力拼贴',
      subtitle: '万物皆可关联的脑洞',
      reminder: '正在强行缝合看似无关的创意元素...',
      icon: 'fa-solid fa-link'
    }
  ] as const;

  const getProgressValue = () => {
    switch(currentPage) {
      case 'trending': return 25;
      case 'detail': return 50;
      case 'input': return 75;
      case 'result': return 100;
      default: return 0;
    }
  };

  const getStepText = () => {
    switch(currentPage) {
      case 'trending': return '第1步：选择热点';
      case 'detail': return '第2步：选择切入点';
      case 'input': return '第3步：输入产品信息';
      case 'result': return '第4步：获取文案结果';
      default: return '';
    }
  };

  const handleTrendClick = (trend: string, index: number) => {
    setSelectedTrend(trend);
    setSelectedTrendIndex(index);
    setCurrentPage('detail');
  };

  const handleStrategyClick = (strategy: (typeof strategies)[number]) => {
    if (isAnalyzingStrategy) return;
    setSelectedStrategy(strategy.title);
    setSelectedStrategyId(strategy.id);
    setSelectedStrategyTitle(strategy.title);
    setStrategyReminder(strategy.reminder);
    setIsAnalyzingStrategy(true);

    // 保留一个“翻译提醒”的 loading 过渡，再进入下一步
    window.setTimeout(() => {
      setIsAnalyzingStrategy(false);
      setCurrentPage('input');
    }, 900);
  };

  useEffect(() => {
    if (currentPage !== 'input') return;
    if (!selectedTrend || !selectedStrategyId || !selectedStrategyTitle) return;

    const ac = new AbortController();
    setIsLoadingSeedIdea(true);
    setSeedIdea('');

    (async () => {
      try {
        const res = await fetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'seed',
            title: selectedTrend,
            engineId: selectedStrategyId,
            engineTitle: selectedStrategyTitle,
          }),
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`Generate seed failed: ${res.status}`);
        const data = (await res.json()) as unknown;
        setSeedIdea(formatDeepSeekJson(data) || '（已生成初步灵感，但内容为空）');
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return;
        console.error(e);
        setSeedIdea('初步灵感生成失败，请稍后重试。');
      } finally {
        setIsLoadingSeedIdea(false);
      }
    })();

    return () => ac.abort();
  }, [currentPage, selectedTrend, selectedStrategyId, selectedStrategyTitle]);

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'custom',
          title: selectedTrend,
          engineId: selectedStrategyId,
          engineTitle: selectedStrategyTitle,
          productInfo,
        }),
      });

      if (!res.ok) throw new Error(`Generate custom failed: ${res.status}`);
      const data = (await res.json()) as unknown;

      const content = formatDeepSeekJson(data) || '生成成功，但未返回可展示内容。';
      setGeneratedContent(content);
      setCurrentContentType('original');
      setDouyinContent('');
      setXiaohongshuContent('');
      setCurrentPage('result');
    } catch (e) {
      console.error(e);
      setGeneratedContent('生成失败，请稍后重试。');
      setCurrentPage('result');
    } finally {
      setIsGenerating(false);
    }
  };

// 1. 修改抖音转化逻辑
  const handleConvertToDouyin = async () => {
    // 关键点：一定要把生成的方案内容 (generatedContent) 发过去
    if (!generatedContent) return;
    setIsConverting('douyin');
    try {
      const res = await fetch('/generate', { // 确认你的接口路径是 /api/generate 还是 /generate
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'custom',
          title: selectedTrend,
          engineId: selectedStrategyId,
          engineTitle: selectedStrategy,
          productInfo,
          originalContent: generatedContent, // 把 P2 的深度内容喂给 AI
          targetPlatform: 'douyin'          // 告诉后端这是抖音请求
        }),
      });

      if (!res.ok) throw new Error(`转换失败`);
      const data = await res.json();
      const content = formatDeepSeekJson(data) || '转化成功，但脚本解析失败';
      setDouyinContent(content);
      setCurrentContentType('douyin');
    } catch (e) {
      console.error(e);
      setDouyinContent('抖音脚本转化失败，请重试。');
    } finally {
      setIsConverting(null);
    }
  };

  // 2. 修改小红书转化逻辑
  const handleConvertToXiaohongshu = async () => {
    if (!generatedContent) return;
    setIsConverting('xiaohongshu');
    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'custom',
          title: selectedTrend,
          engineId: selectedStrategyId,
          engineTitle: selectedStrategy,
          productInfo,
          originalContent: generatedContent, // 把 P2 的深度内容喂给 AI
          targetPlatform: 'xiaohongshu'      // 告诉后端这是小红书请求
        }),
      });

      if (!res.ok) throw new Error(`转换失败`);
      const data = await res.json();
      const content = formatDeepSeekJson(data) || '转化成功，但文案解析失败';
      setXiaohongshuContent(content);
      setCurrentContentType('xiaohongshu');
    } catch (e) {
      console.error(e);
      setXiaohongshuContent('小红书文案转化失败，请重试。');
    } finally {
      setIsConverting(null);
    }
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [...prev,
      { type: 'user', content: chatInput },
      { type: 'ai', content: '我已经根据您的要求优化了文案，请查看上方的最新版本。如需进一步调整，请告诉我具体需要修改的地方。' }
    ]);
    setChatInput('');
  };

  const getCurrentContent = () => {
    switch(currentContentType) {
      case 'douyin': return douyinContent;
      case 'xiaohongshu': return xiaohongshuContent;
      default: return generatedContent;
    }
  };

  const getCurrentTitle = () => {
    switch(currentContentType) {
      case 'douyin': return '抖音脚本';
      case 'xiaohongshu': return '小红书文案';
      default: return '生成的文案';
    }
  };

  const goBack = () => {
    switch(currentPage) {
      case 'trending': setCurrentPage('home'); break;
      case 'detail': setCurrentPage('trending'); break;
      case 'input': setCurrentPage('detail'); break;
      case 'result': setCurrentPage('input'); break;
    }
  };

  const startLoadingTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const res = await fetch('/api/trends', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const apiItems = (await res.json()) as ApiTrendItem[];
      const formatted: Trend[] = apiItems.map((item, index) => {
        const apiHotnum = Number(item?.hotnum) || 0;
        const hotValue = item?.hotText ?? item?.hot ?? apiHotnum;
        const heat = apiHotnum > 0 ? apiHotnum : (parseHotToNumber(hotValue) || 0);
        const safeHeat = heat > 0 ? heat : fallbackHotnumByRank(index);
        const hotText =
          typeof item?.hotText === 'string'
            ? item.hotText
            : typeof hotValue === 'string'
              ? hotValue
              : safeHeat >= 10000
                ? (safeHeat / 10000).toFixed(1) + '万'
              : formatHeatNumber(safeHeat);
        const growth = typeof item?.growth === 'string' ? item.growth : `+${randInt(5, 20)}%`;

        return {
          name: item.title,
          platform: item?.platform ?? '微博',
          glowColor: index % 2 === 0 ? 'shadow-yellow-500/50' : 'shadow-blue-500/50',
          ringColor: index % 2 === 0 ? 'ring-yellow-400' : 'ring-blue-400',
          heat: safeHeat,
          hotText,
          growth,
          description: item?.description ?? '',
          tags: [],
          icon: 'fa-solid fa-fire',
        };
      });

      setTrends(formatted);
      setSelectedTrend('');
      setSelectedTrendIndex(0);
      setCurrentPage('trending');
    } catch (e) {
      console.error(e);
      setTrends([]);
      setCurrentPage('trending');
    } finally {
      setIsLoadingTrends(false);
    }
  };

  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center space-y-8 max-w-2xl mx-auto px-6">
          <div className="space-y-4">
            <h1 className="text-7xl font-bold text-gray-800 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg"
                style={{
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  filter: 'drop-shadow(0 0 8px rgba(147, 197, 253, 0.3))'
                }}>
                PointAI
              </span>
            </h1>
            <div className="space-y-2">
              <p className="text-2xl text-gray-600 font-light tracking-wide"
                style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Click once. Get your idea.
              </p>
              <p className="text-3xl text-gray-700 font-medium">
                点一下，AI给你点子
              </p>
            </div>
            <p className="text-lg text-gray-500 mt-4">
              用热点生成营销灵感
            </p>
          </div>
          
          <div className="pt-8">
            {isLoadingTrends ? (
              <div className="px-16 py-5 text-xl font-medium text-gray-600 flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                <span>加载热点数据中...</span>
              </div>
            ) : (
              <Button
                onClick={startLoadingTrends}
                className="!rounded-button whitespace-nowrap px-16 py-5 text-xl font-medium text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer"
                style={{
                  background: 'linear-gradient(145deg, rgba(147, 197, 253, 0.9), rgba(96, 165, 250, 0.8))',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                  filter: 'drop-shadow(0 0 12px rgba(147, 197, 253, 0.4))',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
                }}
              >
                开始探索
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'trending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 relative overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
        <ParticleBackground />
        <div className="container mx-auto px-6 py-8 max-w-7xl relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={goBack}
              variant="outline"
              className="!rounded-button whitespace-nowrap cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              返回首页
            </Button>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span>实时数据</span>
              </div>
              <span className="text-gray-400">|</span>
              <span>更新时间: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{getStepText()}</span>
              <span className="text-sm text-gray-600">共4步</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>

          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">热点趋势排行榜</h2>
            <p className="text-lg text-gray-600">选择一个热点，开始生成你的营销点子</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">实时热点榜单</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <i className="fa-solid fa-chart-line"></i>
                  <span>热度值</span>
                </div>
              </div>
              {trends.map((trend, index) => (
                <div
                  key={index}
                  onClick={() => handleTrendClick(trend.name, index)}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedTrendIndex === index
                      ? 'ring-2 ring-blue-400 shadow-lg scale-105'
                      : 'hover:shadow-md hover:scale-102'
                  }`}
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '20px'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                        index === 1 ? 'bg-gradient-to-r from-red-400 to-red-500 text-white opacity-80' :
                        index === 2 ? 'bg-gradient-to-r from-red-300 to-red-400 text-white opacity-60' :
                        'bg-gradient-to-r from-red-100 to-red-200 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-800">{trend.name}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            trend.platform === '微博' ? 'bg-red-100 text-red-700' :
                            trend.platform === '知乎' ? 'bg-blue-100 text-blue-700' :
                            trend.platform === '抖音' ? 'bg-black text-white' :
                            trend.platform === '小红书' || trend.platform === '百度' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {trend.platform}
                          </div>
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="flex items-center space-x-2 text-gray-500">
                              <i className="fa-solid fa-fire text-red-500"></i>
                              <span className="font-medium">{trend.hotText}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600 font-medium">
                              <i className="fa-solid fa-arrow-up"></i>
                              <span>{trend.growth}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{trend.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {trend.tags.length === 0 ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                #热搜
                              </span>
                            ) : (
                              trend.tags.map((tag, tagIndex) => (
                              <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                #{tag}
                              </span>
                              ))
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">{formatHeatNumber(trend.heat)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <i className="fa-solid fa-chevron-right text-gray-400"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-center">当前选择</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="relative group cursor-pointer perspective-1000 mb-6">
                      <div
                        className="relative transform-gpu group-hover:scale-105 transition-all duration-500 ease-out group-hover:-translate-y-2"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <div className="relative w-32 h-32 mx-auto transform-gpu transition-all duration-500 group-hover:rotateY-12"
                          style={{
                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '20px',
                          boxShadow: `0 20px 40px ${trends[selectedTrendIndex]?.glowColor?.includes('pink') ? 'rgba(236, 72, 153, 0.15)' :
                              trends[selectedTrendIndex]?.glowColor?.includes('yellow') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'},
                              inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                          }}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center relative z-10">
                              <i className={`text-gray-700 text-3xl mb-2 ${
                                trends[selectedTrendIndex]?.icon || 'fa-solid fa-fire'
                              }`}></i>
                              <div className="text-sm font-medium text-gray-800">
                                #{selectedTrendIndex + 1}
                              </div>
                            </div>
                          </div>
                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                              background: `linear-gradient(145deg, ${trends[selectedTrendIndex]?.glowColor?.includes('pink') ? 'rgba(236, 72, 153, 0.1)' :
                                trends[selectedTrendIndex]?.glowColor?.includes('yellow') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)'} 0%, transparent 50%)`,
                              boxShadow: `inset 0 0 20px ${trends[selectedTrendIndex]?.glowColor?.includes('pink') ? 'rgba(236, 72, 153, 0.3)' :
                                trends[selectedTrendIndex]?.glowColor?.includes('yellow') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                            }}>
                          </div>
                        </div>
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-24 h-6 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-300"
                          style={{
                            background: `radial-gradient(ellipse, ${trends[selectedTrendIndex]?.glowColor?.includes('pink') ? 'rgba(236, 72, 153, 0.4)' :
                              trends[selectedTrendIndex]?.glowColor?.includes('yellow') ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)'} 0%, transparent 70%)`,
                            filter: 'blur(8px)'
                          }}>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{trends[selectedTrendIndex]?.name || '请选择热点'}</h3>
                    
                    {trends[selectedTrendIndex] && (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">热度值:</span>
                          <span className="font-semibold text-gray-800">{formatHeatNumber(trends[selectedTrendIndex]?.heat)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">增长率:</span>
                          <span className="font-semibold text-green-600">{trends[selectedTrendIndex].growth}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">平台:</span>
                          <span className="font-semibold text-gray-800">
                            {trends[selectedTrendIndex]?.platform ?? '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => trends[selectedTrendIndex] && handleTrendClick(trends[selectedTrendIndex].name, selectedTrendIndex)}
                      disabled={!trends[selectedTrendIndex]}
                      className="!rounded-button whitespace-nowrap w-full mt-6 cursor-pointer"
                      style={{
                        background: trends[selectedTrendIndex] ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.8))' : undefined
                      }}
                    >
                      选择这个热点
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'detail') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 relative overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
        <ParticleBackground />
        <div className="container mx-auto px-6 py-8 max-w-6xl relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={goBack}
              variant="outline"
              className="!rounded-button whitespace-nowrap cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              返回热点列表
            </Button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{getStepText()}</span>
              <span className="text-sm text-gray-600">共4步</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>

          <div className="text-center mb-12">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto relative transform hover:scale-105 transition-all duration-500"
                style={{
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '24px',
                  boxShadow: '0 25px 50px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className={`text-gray-700 text-4xl ${
                    trends.find(trend => trend.name === selectedTrend)?.icon || 'fa-solid fa-fire'
                  }`}></i>
                </div>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-28 h-8 rounded-full opacity-60"
                  style={{
                    background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                    filter: 'blur(12px)'
                  }}>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4"
                style={{ textShadow: '0 0 15px rgba(55, 65, 81, 0.2)' }}>{selectedTrend}</h2>
            </div>
            <p className="text-lg text-gray-600"
              style={{ textShadow: '0 0 10px rgba(107, 114, 128, 0.15)' }}>选择一个最适合你产品的营销切入方式</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy, index) => (
              <div
                key={strategy.id}
                onClick={() => handleStrategyClick(strategy)}
                className={`group perspective-1000 ${
                  isAnalyzingStrategy ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                }`}
              >
                <div className="relative transform-gpu group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-500"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    boxShadow: '0 15px 35px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    padding: '24px'
                  }}>
                  <div className="text-center relative z-10">
                    <div className="w-12 h-12 mx-auto mb-4 relative">
                      <div className="absolute inset-0 rounded-lg"
                        style={{
                          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 8px 16px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                        }}>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`text-gray-700 ${strategy.icon}`}></i>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">{strategy.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{strategy.subtitle}</p>
                  </div>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
                      boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.2)'
                    }}>
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 group-active:w-4 group-active:h-4 rounded-full transition-all duration-200"
                    style={{
                      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, transparent 70%)',
                      boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)'
                    }}>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isAnalyzingStrategy && strategyReminder && (
            <div className="mt-10 flex justify-center">
              <div className="fade-in-soft inline-flex items-center gap-3 rounded-full bg-white/70 backdrop-blur px-6 py-3 text-sm text-gray-700 shadow-lg border border-white/60">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span className="tracking-wide">{strategyReminder}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentPage === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 relative overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
        <ParticleBackground />
        <div className="container mx-auto px-6 py-8 max-w-4xl relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={goBack}
              variant="outline"
              className="!rounded-button whitespace-nowrap cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              返回上一页
            </Button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{getStepText()}</span>
              <span className="text-sm text-gray-600">共4步</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>

          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-800 mb-3">产品信息</h2>
            <p className="text-lg text-gray-600">先看初步灵感，再生成你的定制方案</p>
          </div>

          <div className="space-y-8">
            <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>初步 AI 灵感</span>
                  <span className="text-xs font-normal text-gray-500">
                    热搜：{selectedTrend || '—'} · 引擎：{selectedStrategyTitle || '—'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {isLoadingSeedIdea ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <span className="tracking-wide">正在生成初步灵感...</span>
                  </div>
                ) : (
                  <div className="fade-in-soft rounded-lg bg-white/70 border border-white/60 shadow-sm p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-sans">
                      {seedIdea || '（暂无内容）'}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
              <CardContent className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品名称</label>
                  <Input
                    value={productInfo.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductInfo({ ...productInfo, name: e.target.value })
                    }
                    placeholder="请输入产品名称"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品类型</label>
                  <Input
                    value={productInfo.type}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductInfo({ ...productInfo, type: e.target.value })
                    }
                    placeholder="如：护肤品、数码产品、服装等"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">目标人群</label>
                  <Input
                    value={productInfo.audience}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductInfo({ ...productInfo, audience: e.target.value })
                    }
                    placeholder="如：25-35岁女性、学生群体、职场人士等"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品价格</label>
                  <Input
                    value={productInfo.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductInfo({ ...productInfo, price: e.target.value })
                    }
                    placeholder="如：99元、199-299元等"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">核心卖点</label>
                  <Textarea
                    value={productInfo.features}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setProductInfo({ ...productInfo, features: e.target.value })
                    }
                    placeholder="请简述产品的主要优势和特色功能"
                    className="text-sm min-h-[100px]"
                  />
                </div>
              </div>

              <div className="mt-8 text-center">
                {isGenerating ? (
                  <div className="px-12 py-3 text-gray-600 flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <span>AI正在分析生成中...</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateContent}
                    className="!rounded-button whitespace-nowrap px-12 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white cursor-pointer"
                  >
                    生成定制方案
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 relative overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
        <ParticleBackground />
        <div className="container mx-auto px-6 py-8 max-w-6xl relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={goBack}
              variant="outline"
              className="!rounded-button whitespace-nowrap cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              返回上一页
            </Button>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>文案生成成功</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{getStepText()}</span>
              <span className="text-sm text-gray-600">共4步</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">营销文案结果</h2>
            <p className="text-lg text-gray-600">你的营销文案已经生成，可以继续优化</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{getCurrentTitle()}</span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(getCurrentContent())}
                      >
                        <i className="fa-solid fa-copy mr-1"></i>
                        复制文案
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setCurrentContentType('original')}
                      >
                        <i className="fa-solid fa-undo mr-1"></i>
                        返回原文案
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-line text-sm">
                    {getCurrentContent()}
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-4">
                <Button
                  onClick={handleConvertToDouyin}
                  disabled={isConverting === 'douyin'}
                  className="!rounded-button whitespace-nowrap flex-1 bg-red-500 hover:bg-red-600 text-white cursor-pointer disabled:opacity-50"
                >
                  {isConverting === 'douyin' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      转换中...
                    </>
                  ) : (
                    <>
                      <i className="fa-brands fa-tiktok mr-2"></i>
                      转换为抖音脚本
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleConvertToXiaohongshu}
                  disabled={isConverting === 'xiaohongshu'}
                  className="!rounded-button whitespace-nowrap flex-1 bg-pink-500 hover:bg-pink-600 text-white cursor-pointer disabled:opacity-50"
                >
                  {isConverting === 'xiaohongshu' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      转换中...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-heart mr-2"></i>
                      转换为小红书文案
                    </>
                  )}
                </Button>
              </div>

              <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle>AI 对话优化</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto space-y-3">
                      {chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                              message.type === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        value={chatInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                        placeholder="补充更多产品信息或修改需求，让AI帮你优化文案"
                        className="text-sm flex-1"
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleChatSend()}
                      />
                      <Button
                        onClick={handleChatSend}
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                      >
                        <i className="fa-solid fa-paper-plane"></i>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle>选择的热点</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 relative"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 16px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`text-gray-700 text-xl ${
                          trends.find(trend => trend.name === selectedTrend)?.icon || 'fa-solid fa-fire'
                        }`}></i>
                      </div>
                    </div>
                    <p className="font-semibold">{selectedTrend}</p>
                    <div className="flex items-center justify-center mt-2 text-sm text-gray-600">
                      <i className="fa-solid fa-fire text-red-500 mr-1"></i>
                      <span>热度: {formatHeatNumber(trends[selectedTrendIndex]?.heat)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle>营销策略</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 relative"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        boxShadow: '0 6px 12px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`text-gray-700 ${
                          strategies.find(strategy => strategy.title === selectedStrategy)?.icon || 'fa-solid fa-lightbulb'
                        }`}></i>
                      </div>
                    </div>
                    <p className="font-medium">{selectedStrategy}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle>产品信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="font-medium">产品：</span>{productInfo.name}</p>
                  <p><span className="font-medium">类型：</span>{productInfo.type}</p>
                  <p><span className="font-medium">人群：</span>{productInfo.audience}</p>
                  <p><span className="font-medium">价格：</span>{productInfo.price}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
