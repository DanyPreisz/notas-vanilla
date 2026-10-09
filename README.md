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

1. En Atlas: cluster, usuario de base y Network Access con tu IP, o `0.0.0.0/0` si vas a Cloud Run.
2. Copiá `.env.example` a `.env` y completá `MONGODB_URI`. No subas `.env`.
3. Arrancá:

```bash
npm install
npm start
```

Abrí http://localhost:3000

## Cloud Shell

Mismo esquema que series. En Cloud Shell, con la URI de Atlas (base `notas`, no `series`):

```bash
gcloud config set project "$(gcloud projects list --filter='projectNumber=6451687015' --format='value(projectId)')"
git clone https://github.com/DanyPreisz/notas-vanilla.git
cd notas-vanilla
export JWT_SECRET="$(openssl rand -hex 32)"
export MONGODB_URI="mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/notas?retryWrites=true&w=majority&authSource=admin"
bash cloud-shell.sh
```

`JWT_SECRET` es el token que pide el front. Atlas tiene que aceptar `0.0.0.0/0`.

La primera vez, en esta máquina:

```bash
gcloud auth login
gcloud config set project TU_PROYECTO
```

Después, cada subida:

```bash
npm run deploy
```

El script lee `.env`, activa Run / Cloud Build / Artifact Registry y publica `notas-vanilla` en `europe-west1`. Si no hay `NOTES_TOKEN`, lo genera y lo guarda en `.env`. Al terminar imprime la URL.

Atlas tiene que aceptar `0.0.0.0/0`, porque Cloud Run no sale por una IP fija.

## GitHub

https://github.com/DanyPreisz/notas-vanilla

Si cargás estos secrets, cada push a `main` despliega solo:

- `GCP_SA_KEY`: JSON de una cuenta de servicio con Cloud Run Admin y Cloud Build Editor
- `GCP_PROJECT_ID`
- `MONGODB_URI`
- `MONGODB_DB` (opcional, default `notas`)
- `NOTES_TOKEN` (opcional)
