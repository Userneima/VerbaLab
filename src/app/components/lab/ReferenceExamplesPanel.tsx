import { BookOpen, Languages } from 'lucide-react';
import { filterCollocationExamplesForDisplay } from '../../utils/collocationExamples';

type Example = { content: string; chinese?: string; scenario: 'daily' | 'zju' | 'design' };

export function ReferenceExamplesPanel(props: {
  collocationId: string;
  phrase: string;
  examples: Example[];
  showLabTranslationGlobal: boolean;
  clickedLabExampleKey: string | null;
  onToggleGlobalTranslation: () => void;
  onToggleExample: (key: string) => void;
}) {
  const { collocationId, phrase, examples, showLabTranslationGlobal, clickedLabExampleKey, onToggleGlobalTranslation, onToggleExample } = props;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><BookOpen size={16} className="text-indigo-500" />参考例句 — {phrase}</h3>
        <button type="button" onClick={onToggleGlobalTranslation} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${showLabTranslationGlobal ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}>
          <Languages size={12} />
          {showLabTranslationGlobal ? '隐藏中文' : '显示全部中文'}
        </button>
      </div>
      <p className="text-gray-400 text-xs mb-3">{showLabTranslationGlobal ? '已开启：每条例句下方显示中文' : '点击例句卡片可展开/收起该句中文翻译'}</p>
      <div className="space-y-3">
        {filterCollocationExamplesForDisplay(examples).map((ex, i) => {
          const exKey = `${collocationId}-${i}`;
          const showChinese = showLabTranslationGlobal || clickedLabExampleKey === exKey;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => !showLabTranslationGlobal && onToggleExample(exKey)}
              onKeyDown={e => {
                if (!showLabTranslationGlobal && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onToggleExample(exKey);
                }
              }}
              className={`border border-gray-100 rounded-xl p-3.5 transition-all ${showLabTranslationGlobal ? '' : 'cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30'}`}
            >
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ex.scenario === 'daily' ? 'bg-blue-100 text-blue-700' : ex.scenario === 'zju' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{ex.scenario === 'daily' ? '日常' : ex.scenario === 'zju' ? '校园' : '设计'}</span>
              <p className="text-gray-700 text-sm mt-2">{ex.content}</p>
              {showChinese && <p className="text-gray-500 text-sm mt-2 pt-2 border-t border-gray-100">{ex.chinese ?? '（暂无翻译）'}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

