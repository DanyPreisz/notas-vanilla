# Notas vanilla

Bloc de notas personales. Front en HTML, CSS y JS sin frameworks. API en Node (`http`) y persistencia en MongoDB Atlas. Lista para GitHub y Cloud Run.

## Endpoints

| Método | Ruta | Cuerpo |
| --- | --- | --- |
| GET | `/api/health` | — |
| GET | `/api/notes` | — |
| GET | `/api/notes/:id` | — |
| POST | `/api/notes` | `{ title, body }` |
| PUT | `/api/notes/:id` | `{ title, body }` |
| DELETE | `/api/notes/:id` | — |

Si definís `NOTES_TOKEN`, la API exige `Authorization: Bearer <token>`. El front lo pide una vez por pestaña. Sin esa variable, la API queda abierta.

## Local

1. En Atlas: cluster, usuario de base y Network Access con tu IP (o `0.0.0.0/0` si vas a Cloud Run).
2. Copiá `.env.example` a `.env` y completá `MONGODB_URI`. No subas `.env`.
3. Arrancá:

```bash
npm install
export MONGODB_URI="mongodb+srv://..."
export MONGODB_DB=notas
npm start
```

Abrí http://localhost:3000

## GitHub

https://github.com/DanyPreisz/notas-vanilla

## Cloud Run

Atlas tiene que aceptar `0.0.0.0/0`, porque Cloud Run no sale por una IP fija.

```bash
export PROJECT_ID="tu-proyecto"
export MONGODB_URI="mongodb+srv://..."
export MONGODB_DB=notas
export NOTES_TOKEN="$(openssl rand -hex 24)"
bash deploy-cloud-run.sh
```

El servicio escucha en `0.0.0.0` y en el `PORT` que inyecta Cloud Run (8080 en la imagen).
