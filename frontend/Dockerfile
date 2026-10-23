FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY --chown=node:node index.html tsconfig.json vite.config.ts .oxlintrc.json ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src

USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
