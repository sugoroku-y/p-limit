declare namespace jest {
    interface It {
        /** 高負荷環境では失敗する可能性が高いためスキップしてもよいテストの実行 */
        performance: It;
    }
}
