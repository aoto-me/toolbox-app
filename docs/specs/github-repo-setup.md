# GitHubリポジトリ初期設定

新しくGitHubリポジトリ（public）を作る際に、このプロジェクトで採用した設定を再現するための手順。
`gh` CLI（GitHub CLI）が認証済みであることが前提。

## 前提

- リポジトリ本体（`git init` 〜 初回push）は完了している
- `<owner>/<repo>` は対象リポジトリに置き換える
- ワークフローのジョブ名（`ci` / `e2e`）は `.github/workflows/ci.yml` の `jobs:` 直下のキー名。プロジェクトが異なる場合はそのプロジェクトのジョブ名に読み替える

## 1. マージ方法・ブランチ削除（Settings → General）

```bash
gh api -X PATCH repos/<owner>/<repo> \
  -f allow_squash_merge=true \
  -f allow_merge_commit=false \
  -f allow_rebase_merge=false \
  -f delete_branch_on_merge=true
```

| 項目                               | 値  | 理由                                         |
| ---------------------------------- | --- | -------------------------------------------- |
| Allow squash merging               | ON  | マージ方法をSquashに統一するため             |
| Allow merge commits                | OFF | 同上                                         |
| Allow rebase merging               | OFF | 同上                                         |
| Automatically delete head branches | ON  | マージ後にリモートブランチを自動削除するため |

## 2. mainブランチ保護（Settings → Rules → Rulesets）

以下のJSONでrulesetを作成する。

```bash
cat > /tmp/main-ruleset.json <<'EOF'
{
  "name": "mainの保護",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          { "context": "ci" },
          { "context": "e2e" }
        ],
        "strict_required_status_checks_policy": true
      }
    }
  ]
}
EOF

gh api repos/<owner>/<repo>/rulesets --method POST --input /tmp/main-ruleset.json
```

| ルール                    | 内容                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `deletion`                | mainブランチの削除禁止                                                                                     |
| `non_fast_forward`        | force push禁止                                                                                             |
| `required_linear_history` | 履行方式を線形に限定（squash運用と相性が良い）                                                             |
| `pull_request`            | PR必須。承認数0（一人開発のため）。マージ方法はSquashのみ許可                                              |
| `required_status_checks`  | `ci`・`e2e` の通過を必須化。ブランチが最新であることも必須（`strict_required_status_checks_policy: true`） |
| `bypass_actors: []`       | 誰もこのルールをバイパスできない（自分自身も含む）                                                         |

**注意**: `required_status_checks` に指定するジョブ名は、対象リポジトリで一度もそのワークフローが実行されていないと登録できない場合がある。その場合は先に空のPRを1回作ってCIを走らせてから登録する。

## 3. Code security and analysis（Settings → Code security and analysis）

```bash
gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts
gh api -X PUT repos/<owner>/<repo>/automated-security-fixes
gh api -X PATCH repos/<owner>/<repo> \
  -f security_and_analysis[secret_scanning][status]=enabled \
  -f security_and_analysis[secret_scanning_push_protection][status]=enabled
```

| 項目                            | 内容                                   |
| ------------------------------- | -------------------------------------- |
| Dependabot alerts               | 脆弱性の検知・通知                     |
| Dependabot security updates     | 脆弱性修正の自動PR作成                 |
| Secret scanning                 | 秘密情報の混入検知                     |
| Secret scanning push protection | 秘密情報を検知したらpush自体をブロック |

## 4. Interaction limits（Settings → Moderation options）

設定なし（デフォルトのまま）。publicリポジトリなので誰でもIssue/PRを作成できるが、以下の理由で許容している。

- mainブランチ保護により、フォーク経由のPRは書き込み権限を持つ本人がマージしない限り反映されない
- GitHub Actionsの仕様上、フォークからの`pull_request`トリガーのワークフローにはRepository secretsが渡らない

## 5. リポジトリ単体では設定できない項目（GitHubアカウント側）

`github.com/settings/notifications` の「Dependabot alerts」行 → `Email` にチェックが入っているか確認する（アカウント単位の設定なので、一度設定していれば新規リポジトリには個別の対応は不要）。

## 6. 手作業が必要な項目

- **Repository secrets**: 旧リポジトリ（または`.env.local`）の値を確認し、Settings → Secrets and variables → Actions で新規登録する（値そのものをAPI経由でコピーする手段はない）

## 設定後の確認コマンド

```bash
# マージ方法・ブランチ削除
gh api repos/<owner>/<repo> --jq '{allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge}'

# ruleset一覧
gh api repos/<owner>/<repo>/rulesets --jq '.[].name'

# セキュリティ機能
gh api repos/<owner>/<repo> --jq '.security_and_analysis'
gh api repos/<owner>/<repo>/vulnerability-alerts -i | head -1   # 204=有効 / 404=無効
gh api repos/<owner>/<repo>/automated-security-fixes
```
