// Ühtne leheküljemall — päis, jalus, CSS. Kõik vaated kasutavad seda.
// Hono JSX auto-escape'ib kõik stringid => XSS kaitse.
import type { FC, PropsWithChildren } from "hono/jsx";

interface LayoutProps {
  title: string;
  userId?: number | null;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, userId, children }) => (
  <html lang="et">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} | Juuksurisalong</title>
      <link rel="stylesheet" href="/static/styles.css" />
    </head>
    <body>
      <header class="site-header">
        <div class="container">
          <a href="/" class="brand">
            Juuksurisalong
          </a>
          <nav>
            <a href="/">Broneeri aeg</a>
            {userId ? (
              <>
                <a href="/admin/bookings">Admin</a>
                <form method="post" action="/admin/logout" class="inline-form">
                  <button type="submit" class="link-button">
                    Logi välja
                  </button>
                </form>
              </>
            ) : (
              <a href="/admin/login">Admin sisselogimine</a>
            )}
          </nav>
        </div>
      </header>
      <main class="container">{children}</main>
      <footer class="site-footer">
        <div class="container">
          <p>TAK25 kodutöö · Juuksurisalongi broneerimissüsteem</p>
        </div>
      </footer>
    </body>
  </html>
);
