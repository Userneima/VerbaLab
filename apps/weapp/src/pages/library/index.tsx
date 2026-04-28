import { Button, Input, Text, View } from '@tarojs/components';
import { useEffect, useMemo, useState } from 'react';
import { getLearningState, syncLearningState } from '../../features/learning/store';
import type { CorpusEntry, StuckPointEntry } from '../../features/learning/types';
import { getAuthToken } from '../../platform/storage';

export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const [corpus, setCorpus] = useState<CorpusEntry[]>([]);
  const [stuckPoints, setStuckPoints] = useState<StuckPointEntry[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function refreshLocal() {
    const state = getLearningState();
    setCorpus(state.corpus);
    setStuckPoints(state.stuckPoints);
  }

  useEffect(() => {
    refreshLocal();
  }, []);

  const filteredCorpus = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return corpus;
    return corpus.filter((item) =>
      [item.userSentence, item.zhTranslation, item.collocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [corpus, query]);

  const filteredStuck = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stuckPoints;
    return stuckPoints.filter((item) =>
      [item.chineseThought, item.englishAttempt, item.recommendedExpression]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [stuckPoints, query]);

  async function syncNow() {
    if (!getAuthToken()) {
      setMessage('请先到“我的”完成微信登录和邀请码绑定，再同步表达。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const state = await syncLearningState();
      setCorpus(state.corpus);
      setStuckPoints(state.stuckPoints);
      setMessage('表达已同步。');
    } catch (err) {
      refreshLocal();
      setMessage(err instanceof Error ? err.message : '同步失败，已显示本地内容。');
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    wx.setClipboardData({ data: text });
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">把会说的留下来</View>
        <View className="title">我的表达</View>
        <View className="subtitle">
          这里会汇总语料库和卡壳点，方便复制、搜索和再次练习。
        </View>
        <Input
          value={query}
          onInput={(event) => setQuery(String(event.detail.value || ''))}
          placeholder="搜索中文、英文或搭配"
          style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 72px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 12px 18px; font-size: 24px; background: #fff;"
        />
        <Button className="primary-button" loading={loading} disabled={loading} onClick={syncNow}>
          同步表达
        </Button>
        {message ? (
          <View className={message.includes('失败') || message.includes('请先') ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
      </View>
      {filteredCorpus.length === 0 && filteredStuck.length === 0 ? (
        <View className="placeholder-card">还没有表达。可以先去“表达”页生成并保存一句。</View>
      ) : null}
      {filteredCorpus.map((item) => (
        <View className="result-card" key={item.id}>
          <View className="result-label">语料</View>
          <View className="example-sentence">{item.userSentence}</View>
          {item.zhTranslation ? <View className="example-chinese">{item.zhTranslation}</View> : null}
          {item.collocation ? <View className="chip-row"><View className="chip">{item.collocation}</View></View> : null}
          <Button className="secondary-button" onClick={() => copy(item.userSentence)}>复制英文</Button>
        </View>
      ))}
      {filteredStuck.map((item) => (
        <View className="result-card" key={item.id}>
          <View className="result-label">卡壳点</View>
          <View className="recommended-expression">{item.chineseThought}</View>
          {item.recommendedExpression ? <View className="chip-row"><View className="chip">{item.recommendedExpression}</View></View> : null}
          {item.englishAttempt ? <View className="example-card"><View className="example-sentence">{item.englishAttempt}</View></View> : null}
          <Button className="secondary-button" onClick={() => copy(item.englishAttempt || item.recommendedExpression || item.chineseThought)}>复制</Button>
        </View>
      ))}
    </View>
  );
}
