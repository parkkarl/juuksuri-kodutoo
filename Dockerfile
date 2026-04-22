# Bun ametlik pilt (slim)
FROM oven/bun:1.3-slim AS runtime

# Ajavöönd Eesti jaoks (kuupäevad/ajad kuvatakse serveris Tallinna ajas)
ENV TZ=Europe/Tallinn

WORKDIR /app

# Paigalda sõltuvused (ainult prod)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Kopeeri lähtekood
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

EXPOSE 3100

# Käivita app (Bun loeb TypeScripti otse, ilma buildita)
CMD ["bun", "run", "src/index.tsx"]
