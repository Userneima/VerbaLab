/** 避免批量写入时 Date.now 碰撞 */
export function newCorpusEntryId(): string {
  return `S_${crypto.randomUUID()}`;
}

export function newErrorBankEntryId(): string {
  return `E_${crypto.randomUUID()}`;
}

export function newStuckPointId(): string {
  return `ST_${crypto.randomUUID()}`;
}

export function newVocabCardId(): string {
  return `VC_${crypto.randomUUID()}`;
}
