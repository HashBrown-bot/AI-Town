import React, { useState } from 'react';
import { Agent, BigFiveTraits } from '../types/town';
import { 
  UserCog, 
  Sparkles, 
  Plus, 
  Save, 
  Trash2, 
  Check, 
  Palette, 
  Sliders, 
  FileText, 
  Tag 
} from 'lucide-react';
import { generateNewAgentPersona } from '../services/aiTownService';
import { soundEngine } from '../utils/audioSystem';

interface AgentPersonaStudioProps {
  agents: Agent[];
  onSaveAgent: (agent: Agent) => void;
  onCreateAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
}

export const AgentPersonaStudio: React.FC<AgentPersonaStudioProps> = ({
  agents,
  onSaveAgent,
  onCreateAgent,
  onDeleteAgent
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiPromptHint, setAiPromptHint] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Form states
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const [name, setName] = useState<string>(activeAgent?.name || '');
  const [role, setRole] = useState<string>(activeAgent?.role || '');
  const [age, setAge] = useState<number>(activeAgent?.age || 28);
  const [gender, setGender] = useState<string>(activeAgent?.gender || '女');
  const [mbti, setMbti] = useState<string>(activeAgent?.mbti || 'ENFJ');
  const [spriteColor, setSpriteColor] = useState<string>(activeAgent?.spriteColor || '#3b82f6');
  const [bio, setBio] = useState<string>(activeAgent?.bio || '');
  const [quirksInput, setQuirksInput] = useState<string>(activeAgent?.quirks?.join(', ') || '');
  const [bigFive, setBigFive] = useState<BigFiveTraits>(activeAgent?.bigFive || {
    openness: 75,
    conscientiousness: 75,
    extraversion: 75,
    agreeableness: 75,
    neuroticism: 35
  });

  // Switch agent and update form
  const handleSelectAgent = (agent: Agent) => {
    setIsCreatingNew(false);
    setSelectedAgentId(agent.id);
    setName(agent.name);
    setRole(agent.role);
    setAge(agent.age);
    setGender(agent.gender);
    setMbti(agent.mbti);
    setSpriteColor(agent.spriteColor);
    setBio(agent.bio);
    setQuirksInput(agent.quirks?.join(', ') || '');
    setBigFive(agent.bigFive);
    setSaveSuccess(false);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedAgentId('');
    setName('新居民');
    setRole('工艺探索者');
    setAge(26);
    setGender('女');
    setMbti('INFP');
    setSpriteColor('#06b6d4');
    setBio('刚来到Aetheria小镇的旅人，被这里宁静的氛围和友善的居民所吸引。');
    setQuirksInput('喜爱晨间速写, 收集旧书签');
    setBigFive({
      openness: 80,
      conscientiousness: 65,
      extraversion: 50,
      agreeableness: 85,
      neuroticism: 30
    });
    setSaveSuccess(false);
  };

  // AI Auto Generator
  const handleGenerateWithAI = async () => {
    try {
      setIsGeneratingAI(true);
      const generated = await generateNewAgentPersona(aiPromptHint || '一位独特的像素小镇居民');
      if (generated.name) setName(generated.name);
      if (generated.role) setRole(generated.role);
      if (generated.age) setAge(generated.age);
      if (generated.gender) setGender(generated.gender);
      if (generated.mbti) setMbti(generated.mbti);
      if (generated.spriteColor) setSpriteColor(generated.spriteColor);
      if (generated.bio) setBio(generated.bio);
      if (generated.quirks) setQuirksInput(generated.quirks.join(', '));
      if (generated.bigFive) setBigFive(generated.bigFive);
      soundEngine.playChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = () => {
    const quirksArray = quirksInput
      .split(/[,，]/)
      .map(s => s.trim())
      .filter(Boolean);

    if (isCreatingNew) {
      const newId = `agent-${Date.now()}`;
      const newAgent: Agent = {
        id: newId,
        name,
        role,
        age: Number(age),
        gender,
        spriteColor,
        mbti,
        bigFive,
        bio,
        quirks: quirksArray,
        state: {
          energy: 85,
          mood: 75,
          stress: 18,
          sociability: 75
        },
        physicalNeeds: {
          energy: 85,
          hunger: 20,
          health: 92,
        },
        psychologicalNeeds: {
          mood: 75,
          stress: 18,
          fun: 60,
          comfort: 80,
        },
        socialNeeds: {
          social: 70,
          belonging: 75,
        },
        cognitiveNeeds: {
          curiosity: 65,
          achievement: 60,
        },
        activeConditionTags: ['✨ 身心饱满'],
        needs: {
          energy: 85,
          hunger: 20,
          health: 92,
          social: 70,
          fun: 60,
          comfort: 80,
          curiosity: 65,
          safety: 85,
          belonging: 75,
          achievement: 60,
          stress: 18,
          mood: 75
        },
        currentActivity: `在小镇漫步了解环境`,
        currentThought: `这里的空气真清新，希望能尽快融入大家。`,
        currentGoal: `尽快熟悉小镇的环境与居民，建立属于自己的生活步调`,
        currentBuildingId: 'central_park',
        x: 520,
        y: 460,
        targetX: 520,
        targetY: 460,
        speed: 1.2,
        direction: 'down',
        isMoving: false,
        affinity: {},
        memories: [
          {
            id: `mem-${Date.now()}`,
            type: 'episodic',
            simDay: 1,
            simTime: '10:00',
            content: `搬入了Aetheria智能小镇，开始了全新的人生篇章。`,
            importance: 10,
            emotionalIntensity: 8,
            relatedAgentIds: [],
            tags: ['定居', '新生活', '初见'],
            createdAt: { simDay: 1, simTime: '10:00', timestamp: Date.now() },
            lastAccessedAt: { simDay: 1, simTime: '10:00', timestamp: Date.now() },
            sentiment: 'positive'
          }
        ],
        moodHistory: [{ simTime: '10:00', mood: 70, stress: 20 }]
      };
      onCreateAgent(newAgent);
      setIsCreatingNew(false);
      setSelectedAgentId(newId);
    } else {
      const updated: Agent = {
        ...activeAgent,
        name,
        role,
        age: Number(age),
        gender,
        spriteColor,
        mbti,
        bigFive,
        bio,
        quirks: quirksArray
      };
      onSaveAgent(updated);
    }

    soundEngine.playClick();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const colorOptions = [
    { label: '海蓝', val: '#3b82f6' },
    { label: '青金', val: '#06b6d4' },
    { label: '翡翠', val: '#10b981' },
    { label: '金橘', val: '#f59e0b' },
    { label: '珊瑚', val: '#f97316' },
    { label: '紫晶', val: '#8b5cf6' },
    { label: '玫瑰', val: '#ec4899' },
    { label: '玄青', val: '#475569' }
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>角色个性化配置系统</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Persona Studio
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            定义居民的大五人格基准、MBTI心理类型、背景怪癖与形象色彩，增强模拟真实感
          </p>
        </div>

        <button
          onClick={handleStartCreateNew}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-900/30 transition self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>创建新居民</span>
        </button>
      </div>

      {/* Main Studio Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Agent List (1 Col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            小镇居民名册 ({agents.length})
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {agents.map(agent => {
              const isSelected = !isCreatingNew && agent.id === selectedAgentId;
              return (
                <div
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                      : 'bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: agent.spriteColor || '#3b82f6' }}
                    />
                    <div>
                      <div className="font-semibold text-xs">{agent.name}</div>
                      <div className="text-[11px] text-slate-400">{agent.role}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                    {agent.mbti}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Configuration Form (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Generator Banner */}
          <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-blue-800/30 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-white">AI 智能角色生成器</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  输入角色关键词或期望风格，由 Gemini 自动补全个性、大五人格与生平
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={aiPromptHint}
                onChange={e => setAiPromptHint(e.target.value)}
                placeholder="例如: 痴迷古乐谱的钟表匠..."
                className="bg-slate-950/90 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 flex-1 sm:w-48"
              />
              <button
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow transition whitespace-nowrap"
              >
                {isGeneratingAI ? '生成中...' : '灵感生成'}
              </button>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-white">
                  {isCreatingNew ? '新建居民档案' : `编辑居民: ${name}`}
                </h3>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <Check className="w-3.5 h-3.5" /> 已成功保存并同步云端
                </div>
              )}
            </div>

            {/* Basic Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  中文姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  职业角色
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  年龄 / 性别
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-16 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="女">女</option>
                    <option value="男">男</option>
                    <option value="非二元">非二元</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  MBTI 心理类型
                </label>
                <select
                  value={mbti}
                  onChange={e => setMbti(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sprite Color Selection */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>像素角色代表色调</span>
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {colorOptions.map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setSpriteColor(opt.val)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition ${
                      spriteColor === opt.val
                        ? 'border-white bg-slate-800 text-white font-medium shadow-sm'
                        : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.val }} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Big Five Sliders */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>大五人格参数矩阵 (Big Five Traits)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'openness', label: '开放性 (Openness)' },
                  { key: 'conscientiousness', label: '尽责性 (Conscientiousness)' },
                  { key: 'extraversion', label: '外向性 (Extraversion)' },
                  { key: 'agreeableness', label: '宜人性 (Agreeableness)' },
                  { key: 'neuroticism', label: '情绪敏感性 (Neuroticism)' }
                ].map(item => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.label}</span>
                      <span className="font-mono text-slate-400">
                        {(bigFive as any)[item.key]} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(bigFive as any)[item.key]}
                      onChange={e => setBigFive({
                        ...bigFive,
                        [item.key]: Number(e.target.value)
                      })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Backstory & Quirks */}
            <div className="pt-2 border-t border-slate-800 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>角色背景故事与生平</span>
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
                  placeholder="详细介绍该居民的过往经历、来到小镇的契机以及在小镇扮演的角色..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>个性习惯与怪癖 (用逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={quirksInput}
                  onChange={e => setQuirksInput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="随身带放大镜, 喝咖啡不加糖, 习惯晴天写生..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              {!isCreatingNew && agents.length > 2 && (
                <button
                  type="button"
                  onClick={() => onDeleteAgent(activeAgent.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>注销迁出该居民</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-900/30 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isCreatingNew ? '确认入驻小镇' : '保存个性化配置'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
