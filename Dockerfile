FROM zenika/alpine-chrome:with-node

ARG TELEGRAM_BOT_TOKEN
ARG TELEGRAM_VALID_USERNAMES

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

# Create app directory
WORKDIR /usr/src/app

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

COPY package.json yarn.lock ./

# Install deps
RUN yarn

# Bundle app source
COPY . .

# Build
RUN yarn build

ENTRYPOINT ["tini", "--"]

# Start
CMD [ "yarn", "start" ]