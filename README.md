# PR Size Labeler

Automatically label your Pull Requests with size indicators -- **XS**, **S**, **M**, **L**, **XL** -- based on the total number of lines changed.

Helps teams quickly triage PRs, encourage smaller changes, and keep code review manageable.

---

## How it works

When a Pull Request is opened or updated, this action:

1. Fetches the PR diff stats (additions + deletions).
2. Calculates the total number of changed lines.
3. Applies a `size/*` label based on configurable thresholds.
4. Removes any previously applied size label so only one is present at a time.
5. Posts (or updates) a comment with a breakdown of the changes.

### Default thresholds

| Label | Changed lines |
|-------|---------------|
| `size/XS` | 0 -- 10 |
| `size/S` | 11 -- 50 |
| `size/M` | 51 -- 200 |
| `size/L` | 201 -- 500 |
| `size/XL` | 501+ |

Labels are created automatically in your repository with a color gradient from green (XS) to red (XL).

---

## Usage

Add the following workflow file to your repository at `.github/workflows/pr-size.yml`:

```yaml
name: PR Size Labeler

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: tatelyman/pr-size-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Custom thresholds

```yaml
      - uses: tatelyman/pr-size-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          xs_max: "5"
          s_max: "25"
          m_max: "100"
          l_max: "300"
```

---

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github_token` | GitHub token for API access | Yes | -- |
| `xs_max` | Max changed lines for **XS** | No | `10` |
| `s_max` | Max changed lines for **S** | No | `50` |
| `m_max` | Max changed lines for **M** | No | `200` |
| `l_max` | Max changed lines for **L** | No | `500` |

Anything above `l_max` is labeled **XL**.

## Outputs

| Output | Description |
|--------|-------------|
| `label` | The size label that was applied (e.g. `size/M`) |
| `total_changes` | Total number of changed lines |
| `additions` | Number of added lines |
| `deletions` | Number of deleted lines |

---

## Examples

### PR comment

When the action runs, it posts a comment like this:

> **size/M Pull Request**
>
> | Metric | Count |
> |--------|-------|
> | Additions | +120 |
> | Deletions | -45 |
> | **Total changes** | **165** |

### Labels

The action creates color-coded labels automatically:

- `size/XS` -- green
- `size/S` -- yellow-green
- `size/M` -- yellow
- `size/L` -- orange
- `size/XL` -- red

---

## Permissions

The action needs the following permissions:

- `pull-requests: write` -- to add labels and post comments
- `contents: read` -- to access PR diff stats

These are configured in the workflow YAML as shown in the usage example above.

---

## License

MIT

---

## Support

If you find this useful, consider supporting the project:

[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com)

**SOL Wallet:** `NaTTUfDDQ8U1RBqb9q5rz6vJ22cWrrT5UAsXuxnb2Wr`

- [DevTools.run](https://devtools-site-delta.vercel.app) — Free developer tools
- [@solscanitbot](https://t.me/solscanitbot) — Solana trading bot on Telegram
- [GitHub Sponsors](https://github.com/sponsors/TateLyman)
