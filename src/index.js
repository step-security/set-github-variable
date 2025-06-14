import core, { getInput, setOutput, setFailed } from '@actions/core';
import { Octokit } from '@octokit/core';
import fetch from 'node-fetch';
import axios, { isAxiosError } from 'axios';

async function validateSubscription() {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;

  try {
    await axios.get(API_URL, { timeout: 3000 });
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      core.error(
        'Subscription is not valid. Reach out to support@stepsecurity.io'
      );
      process.exit(1);
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.');
    }
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
