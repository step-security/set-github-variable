import core, { getInput, setOutput, setFailed } from '@actions/core';
import { Octokit } from '@octokit/core';
import fetch from 'node-fetch';
import axios from 'axios';
import fs from 'fs';

async function validateSubscription() {
  let repoPrivate;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    repoPrivate = payload?.repository?.private;
  }

  const upstream = 'mmoyaferrer/set-github-variable';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl =
    'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false)
      core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body = { action: action || '' };

  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      { timeout: 3000 },
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error(
          '\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m'
      );
      core.error(
          `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`
      );
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

async function run() {
    try {
        await validateSubscription();
        const parameters = {
            name: getInput('name'),
            value: getInput('value'),
            repository: getInput('repository'),
            token: getInput('token'),
            org: getInput('org'),
            base: getInput('org') ? 'orgs' : 'repos',
            visibility: getInput('visibility'),
            selectedRepositoryIds: getInput('selectedRepositoryIds')
        };

        const response = await updateVariable(parameters);

        if (response.status < 400) {
            setOutput('data', response.data);
            setOutput('status', response.status);
        } else {
            throw { message: response.data, status: response.status };
        }
    } catch (error) {
        handleError(error);
    }
}

function updateVariable(parameters) {
    const octokit = new Octokit({
        auth: parameters.token,
        request: {
            fetch: fetch
        }
    });

    return octokit.request(`PATCH /${parameters.base}/${parameters.repository}/actions/variables/${parameters.name}`, {
        value: parameters.value,
        selected_repository_ids: parameters.selectedRepositoryIds,
        visibility: parameters.visibility
    });
}

function handleError(error) {
    setFailed('error message: ' + error.message);
    setFailed('error status: ' + error.status);
}

run();
