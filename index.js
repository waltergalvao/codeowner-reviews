const core = require('@actions/core');
const { Octokit } = require('@octokit/core');
const { paginateRest } = require('@octokit/plugin-paginate-rest');

async function run() {
  const owner = core.getInput('owner');
  const repo = core.getInput('repo');
  const token = core.getInput('github-token', {required: true});
  const pullNumber = core.getInput('pull_number');
  const codeOwners = core.getInput('codeowners', {required: true});

  const octokit = Octokit.plugin(paginateRest);
  const client = new octokit({auth: `token ${token}`});

  const results = await client.paginate(
    `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`,
    {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    }
  );

  let totalApprovals = 0;
  let codeOwnerApprovals = 0;

  for (const result of results) {
    if (result.state !== 'APPROVED') continue;

    totalApprovals = totalApprovals + 1;

    if (codeOwners.includes(`@${result.user.login}`)) {
      codeOwnerApprovals = codeOwnerApprovals + 1;
    }
  }

  core.setOutput('approval_count', totalApprovals);
  core.setOutput('co_approval_count', codeOwnerApprovals);
  core.setOutput('non_co_approval_count', totalApprovals - codeOwnerApprovals);
}

run();
