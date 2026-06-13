### Software

- **Frontend:** React 19, TypeScript, Vite, React Router, Redux Toolkit, Axios, Leaflet, and OpenStreetMap.
- **Backend:** .NET 10, ASP.NET Core Web API, Entity Framework Core, AutoMapper, and FluentValidation.
- **Platform:** Microsoft Service Fabric.
- **Database:** Microsoft SQL Server Express.
- **Authentication:** JWT bearer tokens with BCrypt password hashing.

### Services

| Service | Type | Port | Responsibility |
| --- | --- | --- | --- |
| `UserService` | Stateless | `5001` | Registration, login, JWT creation, users, roles, and account administration |
| `TravelPlanService` | Stateless | `5002` | Travel plans, destinations, activities, expenses, checklists, sharing, and administration |
| `RouteService` | Stateful | `5003` | Route calculation and Service Fabric Reliable Dictionary caching |

## Requirements

- Windows PowerShell 5.1 or newer.
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).
- Entity Framework Core command-line tools 10.x:
- Node.js
- Microsoft Service Fabric Runtime and SDK.
- A running local one-node Service Fabric development cluster at `localhost:19000`.
- SQL Server Express available as `.\SQLEXPRESS`.


## Setup

### 1. Configure the backend

Adjust the .env.exmaple per need

```
.\backend\.env.example
```

### 2. Configure the frontend

Adjust the .env.exmaple per need

```
.\frontend\.env
```

The example configuration uses the local service endpoints:

- `http://localhost:5001` for `UserService`.
- `http://localhost:5002` for `TravelPlanService`.
- `http://localhost:5003` for `RouteService`.

It also configures the OpenStreetMap tile URL used by the map components.

### 3. Install frontend packages

In the frontend folder:
```
npm install
```

### 4. Apply database migrations

Apply the user database migrations (each for it's own folder, itty bitty powershell magic):

```powershell
Set-Location .\backend\UserService
dotnet ef database update --connection "Server=.\SQLEXPRESS;Database=TravelPlannerUsers;Trusted_Connection=True;TrustServerCertificate=True;"
Set-Location ..\..
```

Apply the travel-plan database migrations:

```powershell
Set-Location .\backend\TravelPlanService
dotnet ef database update --connection "Server=.\SQLEXPRESS;Database=TravelPlanDb;Trusted_Connection=True;TrustServerCertificate=True;"
Set-Location ..\..
```

`RouteService` reads `TravelPlanDb` and stores its route cache in Service Fabric reliable state, so it does not have a separate EF migration set.

Review generated migrations before applying them.

## Start

### 1. Start the cluster

Start the local one-node Service Fabric cluster and wait until it reports healthy.

### 2. Clear the existing Service Fabric application (clean workspace)

```powershell
.\backend\Clear-ServiceFabricCluster.ps1 -Force
```

### 3. Build and deploy the backend (deploys everything)

```powershell
.\backend\Deploy-ServiceFabricApplication.ps1
```

### 4. Start the frontend

In the frontend folder:

```
npm run dev
```
