// 非同期処理が時間差で重なって完了したとき、最後に開始したものだけを有効な結果として扱うための順序管理
export function createSaveSequence() {
  let latestId = 0;

  return {
    isLatest(id: number): boolean {
      // latestIdの初期値0がそのままisLatest(0)に一致してしまわないようにする
      return latestId !== 0 && id === latestId;
    },
    start(): number {
      latestId += 1;
      return latestId;
    },
  };
}
