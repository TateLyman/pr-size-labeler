const core = require("@actions/core");
const github = require("@actions/github");

const SIZE_LABELS = ["size/XS", "size/S", "size/M", "size/L", "size/XL"];

function getSizeLabel(totalChanges, thresholds) {
  if (totalChanges <= thresholds.xs) return "size/XS";
  if (totalChanges <= thresholds.s) return "size/S";
  if (totalChanges <= thresholds.m) return "size/M";
  if (totalChanges <= thresholds.l) return "size/L";
  return "size/XL";
}

async function ensureLabelsExist(octokit, owner, repo) {
  const labelColors = {
    "size/XS": "3CBF00",
    "size/S": "5D9801",
    "size/M": "7F7203",
    "size/L": "A14C05",
    "size/XL": "C32607",
  };

  for (const [name, color] of Object.entries(labelColors)) {
    try {
      await octokit.rest.issues.getLabel({ owner, repo, name });
    } catch (error) {
      if (error.status === 404) {
        core.info(`Creating label "${name}"...`);
        await octokit.rest.issues.createLabel({
          owner,
          repo,
          name,
          color,
          description: `Pull request size: ${name.split("/")[1]}`,
        });
      }
    }
  }
}

async function removeExistingSizeLabels(octokit, owner, repo, pullNumber) {
  const { data: currentLabels } = await octokit.rest.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number: pullNumber,
  });

  const existingSizeLabels = currentLabels.filter((label) =>
    SIZE_LABELS.includes(label.name)
  );

  for (const label of existingSizeLabels) {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: pullNumber,
      name: label.name,
    });
    core.info(`Removed existing label "${label.name}"`);
  }

  return existingSizeLabels.map((l) => l.name);
}

async function addSizeComment(
  octokit,
  owner,
  repo,
  pullNumber,
  additions,
  deletions,
  totalChanges,
  sizeLabel
) {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
  });

  const marker = "<!-- pr-size-labeler -->";
  const existingComment = comments.find(
    (c) => c.body && c.body.includes(marker)
  );

  const body = [
    marker,
    `## ${sizeLabel} Pull Request`,
    "",
    "| Metric | Count |",
    "|--------|-------|",
    `| Additions | +${additions} |`,
    `| Deletions | -${deletions} |`,
    `| **Total changes** | **${totalChanges}** |`,
    "",
    "<details>",
    "<summary>Size thresholds</summary>",
    "",
    "| Label | Range |",
    "|-------|-------|",
    `| \`size/XS\` | 0\u2013${core.getInput("xs_max")} |`,
    `| \`size/S\` | ${parseInt(core.getInput("xs_max"), 10) + 1}\u2013${core.getInput("s_max")} |`,
    `| \`size/M\` | ${parseInt(core.getInput("s_max"), 10) + 1}\u2013${core.getInput("m_max")} |`,
    `| \`size/L\` | ${parseInt(core.getInput("m_max"), 10) + 1}\u2013${core.getInput("l_max")} |`,
    `| \`size/XL\` | ${parseInt(core.getInput("l_max"), 10) + 1}+ |`,
    "",
    "</details>",
  ].join("\n");

  if (existingComment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
    core.info("Updated existing size comment");
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    });
    core.info("Added size breakdown comment");
  }
}

async function run() {
  try {
    const token = core.getInput("github_token", { required: true });
    const octokit = github.getOctokit(token);

    const thresholds = {
      xs: parseInt(core.getInput("xs_max"), 10),
      s: parseInt(core.getInput("s_max"), 10),
      m: parseInt(core.getInput("m_max"), 10),
      l: parseInt(core.getInput("l_max"), 10),
    };

    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed(
        "This action can only run on pull_request or pull_request_target events."
      );
      return;
    }

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const pullNumber = context.payload.pull_request.number;

    core.info(`Processing PR #${pullNumber} in ${owner}/${repo}`);

    // Fetch the full PR data to get additions/deletions
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const additions = pullRequest.additions;
    const deletions = pullRequest.deletions;
    const totalChanges = additions + deletions;

    core.info(
      `PR stats: +${additions} -${deletions} (${totalChanges} total changes)`
    );

    const sizeLabel = getSizeLabel(totalChanges, thresholds);
    core.info(`Determined size: ${sizeLabel}`);

    // Ensure all size labels exist in the repo
    await ensureLabelsExist(octokit, owner, repo);

    // Remove any existing size labels
    const removed = await removeExistingSizeLabels(
      octokit,
      owner,
      repo,
      pullNumber
    );

    // Apply the new size label
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pullNumber,
      labels: [sizeLabel],
    });
    core.info(`Applied label "${sizeLabel}"`);

    // Add or update the size breakdown comment
    await addSizeComment(
      octokit,
      owner,
      repo,
      pullNumber,
      additions,
      deletions,
      totalChanges,
      sizeLabel
    );

    // Set outputs
    core.setOutput("label", sizeLabel);
    core.setOutput("total_changes", totalChanges.toString());
    core.setOutput("additions", additions.toString());
    core.setOutput("deletions", deletions.toString());

    core.info("PR Size Labeler completed successfully.");
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
