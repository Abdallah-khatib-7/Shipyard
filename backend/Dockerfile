# Build-runner image: pushed to ECR (shipyard-build-runner) and run one-per-build
# by services/buildRunner.service.ts via Dockerode. Never reused across builds.
FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /workspace
RUN mkdir -p /workspace/repo /workspace/output && chown -R node:node /workspace

COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
