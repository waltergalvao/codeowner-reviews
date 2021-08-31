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
  const reviewers = {};

  // Results has whole history of reviews, meaning multiple per user
  // We just want the last one, as results are ordered
  for (const result of results) {
    reviewers[result.user.login] = result;
  }

  for (const review of Object.values(reviewers)) {
    if (review.state !== 'APPROVED') continue;

    core.info(JSON.stringify(review));
    totalApprovals = totalApprovals + 1;

    if (codeOwners.includes(`@${review.user.login}`)) {
      codeOwnerApprovals = codeOwnerApprovals + 1;
    }
  }

  const changesRequested = Object.values(reviewers).filter(review => review.state === 'CHANGES_REQUESTED').length;

  core.info(JSON.stringify(reviewers));
  core.info(`Total Reviews: ${totalApprovals}`);
  core.info(`CO Reviews: ${codeOwnerApprovals}`);
  core.info(`Changes Requested: ${changesRequested}`);

  core.setOutput('approval_count', totalApprovals);
  core.setOutput('co_approval_count', codeOwnerApprovals);
  core.setOutput('non_co_approval_count', totalApprovals - codeOwnerApprovals);
  core.setOutput('changes_requested_count', changesRequested);
}

run();
