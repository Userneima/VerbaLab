import { X } from 'lucide-react';
import { VOCAB_TAG_OPTION_GROUPS } from '../../utils/vocabCardScenarioTags';

type VocabCardTagSectionProps = {
  tags: string[];
  tagsEditingOpen: boolean;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePresetTag: (tag: string) => void;
};

export function VocabCardTagSection({
  tags,
  tagsEditingOpen,
  onOpenEdit,
  onCloseEdit,
  onRemoveTag,
  onTogglePresetTag,
}: VocabCardTagSectionProps) {
  return (
    <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white">
      {!tagsEditingOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
            {tags.length === 0 ? (
              <p className="text-xs text-gray-400">暂无标签</p>
            ) : (
              tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700"
                >
                  {tag}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onOpenEdit}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-0.5 rounded-lg hover:bg-violet-50 shrink-0 self-center"
          >
            编辑标签
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-0.5 text-xs pl-2 pr-1 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className="p-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`删除标签 ${tag}`}
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">暂无标签</span>
              )}
            </div>
            <button
              type="button"
              onClick={onCloseEdit}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-0.5 rounded-lg hover:bg-violet-50 shrink-0 self-center"
            >
              完成
            </button>
          </div>
          <div className="rounded-lg border border-gray-100 bg-slate-50/60 px-2 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-500">标准标签</span>
              <span className="text-[10px] text-gray-400">建议控制在 2-4 个</span>
            </div>
            {VOCAB_TAG_OPTION_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="text-[10px] text-gray-400">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.tags.map((tag) => {
                    const selected = tags.includes(tag);
                    const disabled = !selected && tags.length >= 4;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onTogglePresetTag(tag)}
                        disabled={disabled}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          selected
                            ? 'border-violet-200 bg-violet-50 text-violet-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:text-violet-700'
                        } ${disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
