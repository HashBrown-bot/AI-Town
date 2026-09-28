import React, { useState } from 'react';
import { InteractionRecord, Agent } from '../types/town';
import { X, Download, Copy, Check, Database, Code2, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

interface FineTuningExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: InteractionRecord[];
  agents: Agent[];
}

export const FineTuningExportModal: React.FC<FineTuningExportModalProps> = ({
  isOpen,
  onClose,
  interactions,
  agents
}) => {
  const [format, setFormat] = useState<'sharegpt' | 'alpaca' | 'openai'>('openai');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Convert interactions to fine-tuning datasets
  const generateDataset = () => {
    return interactions.map(record => {
      const agentA = agents.find(a => a.id === record.participants[0]);
      const agentB = agents.find(a => a.id === record.participants[1]);

      const systemPrompt = `你正在扮演小镇居民“${agentA?.name || '居民'}”（职业: ${agentA?.role || '小镇居民'}, MBTI: ${agentA?.mbti || 'ENFJ'}）。请根据你的人格特质与过往记忆进行自然交谈。`;

      if (format === 'openai') {
        return {
          messages: [
            { role: 'system', content: systemPrompt },
            ...record.messages.map(m => ({
              role: m.speakerId === agentA?.id ? 'assistant' : 'user',
              content: m.text
            }))
          ],
          metadata: {
            interaction_id: record.id,
            location: record.location,
            topic: record.topic,
            sentiment: record.sentiment,
            sentiment_score: record.sentimentScore
          }
        };
      } else if (format === 'sharegpt') {
        return {
          conversations: [
            { from: 'system', value: systemPrompt },
            ...record.messages.map(m => ({
              from: m.speakerId === agentA?.id ? 'gpt' : 'human',
              value: m.text
            }))
          ],
          id: record.id
        };
      } else {
        // Alpaca Format
        return {
          instruction: `在${record.location}与${agentB?.name || '居民'}交流关于“${record.topic}”的话题。`,
          input: record.messages[0]?.text || '',
          output: record.messages[1]?.text || '',
          persona: agentA?.bio || ''
        };
      }
    });
  };

  const dataset = generateDataset();
  const jsonlString = dataset.map(d => JSON.stringify(d)).join('\n');

  const handleDownload = () => {
    soundEngine.playClick();
    const blob = new Blob([jsonlString], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aetheria_agent_finetune_${format}_${Date.now()}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonlString);
    setCopied(true);
    soundEngine.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                模型微调数据集导出中枢 (Fine-tuning Exporter)
              </h3>
              <p className="text-xs text-slate-400">
                将小镇居民的真实交互对话与性格心理日志转换为通用 LLM 训练语料
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Format Selector */}
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">选择目标微调格式标准：</span>
            <div className="flex items-center gap-2">
              {[
                { id: 'openai', label: 'OpenAI Chat JSONL' },
                { id: 'sharegpt', label: 'ShareGPT 格式' },
                { id: 'alpaca', label: 'Alpaca 指令对' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl border transition ${
                    format === f.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dataset Stats */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">可用样本条数</span>
              <span className="text-base font-bold text-white">{interactions.length} 条</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">参与角色数</span>
              <span className="text-base font-bold text-blue-400">{agents.length} 位</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">持久化源</span>
              <span className="text-base font-bold text-emerald-400">Firestore Cloud</span>
            </div>
          </div>

          {/* Preview Codebox */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Code2 className="w-3.5 h-3.5" /> 预览前两条微调语料样本:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制代码'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-56 leading-relaxed">
              {dataset.slice(0, 2).map(d => JSON.stringify(d, null, 2)).join('\n\n')}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            关闭
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载 .jsonl 训练集文件</span>
          </button>
        </div>
      </div>
    </div>
  );
};
