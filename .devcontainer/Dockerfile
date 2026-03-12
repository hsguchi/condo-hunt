FROM mcr.microsoft.com/playwright:v1.58.2-noble

RUN apt-get update \
  && apt-get install -y --no-install-recommends gh vim \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /root/.config/opencode
RUN mkdir -p /root/.gsd
RUN mkdir -p /root/.local/share/opencode
RUN npm install --global firecrawl-cli opencode-ai ctx7 mcporter gsd-pi
