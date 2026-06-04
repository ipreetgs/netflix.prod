# Netflix Clone Microservices Platform

A production-ready microservices implementation of a Netflix-like streaming platform designed for hands-on practice with modern cloud native architectures.

## Cloud Architecture Stack
* **Traffic Routing**: Route53 (Latency + Geolocation Routing) and CloudFront (WAF ACL Protected)
* **Compute Platform**: Multi-Region EKS Clusters (Primary: `us-east-1`, Secondary: `us-west-2`)
* **Databases**: Aurora Global Database (PostgreSQL) & ElastiCache Redis Global Datastore
* **Video CDN**: Amazon S3 + CloudFront (Secure URL signing token authorization)
* **CD / Deployment**: ArgoCD + Argo Rollouts (Progressive Canary deployments)
* **Monitoring**: Dynatrace OneAgent auto-instrumentation & Prometheus metrics endpoint stubs

---

## Directory Layout
* `frontend/`: React + TypeScript UI styled with custom high-fidelity Netflix aesthetic CSS.
* `services/catalog/`: Movie metadata service, integrated with Aurora PostgreSQL and ElastiCache Redis cache layer.
* `services/user/`: Authentication, viewer profiles, lists, and playback tracking history.
* `services/streaming/`: Secure video stream dispenser (Generates CloudFront Signed URLs).
* `k8s/`: Deployments, cluster services, HPAs, Ingress, and Argo Rollouts configurations (Canary Analysis).
* `terraform/`: Infrastructure-as-code scripts for multi-region VPCs, EKS clusters, databases, and Route53 DNS.

---

## Part 1: Running Locally (Docker Compose Sandbox)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
* [Node.js](https://nodejs.org/) (optional, for standalone dev run).

### Quickstart (Windows PowerShell)
Run the automated sandbox script to boot the microservice containers, PostgreSQL database, and Redis cache:
```powershell
./run-local.ps1
```

Or run Docker Compose manually:
```bash
docker-compose up --build -d
```

### Accessing the Applications
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **User Service API**: [http://localhost:5001](http://localhost:5001)
* **Catalog Service API**: [http://localhost:5002](http://localhost:5002)
* **Streaming Service API**: [http://localhost:5003](http://localhost:5003)
* **Postgres Database**: `localhost:5432` (`netflix_db`)
* **Redis Cache**: `localhost:6379`

### Stopping the Sandbox
To stop containers and wipe volume data:
```bash
docker-compose down -v
```

---

## Part 2: AWS Production Deployment Roadmap

Follow this step-by-step procedure to deploy the Netflix Clone onto AWS:

### 1. Provision Infrastructure with Terraform
Navigate to `/terraform`. Initialize and apply the configuration to provision the VPCs, EKS Clusters, Aurora Global Database, ElastiCache Global Datastore, CloudFront, Route53, and WAF Web ACLs:
```bash
cd terraform
terraform init
terraform apply -auto-approve
```

### 2. Configure EKS Contexts
Connect to your newly provisioned EKS clusters:
```bash
# Connect to Primary Cluster (us-east-1)
aws eks update-kubeconfig --region us-east-1 --name netflix-clone-primary-eks

# Connect to Secondary Cluster (us-west-2)
aws eks update-kubeconfig --region us-west-2 --name netflix-clone-secondary-eks
```

### 3. Setup AWS Secrets in EKS
Create Kubernetes secrets containing your databases and security keys on both clusters:
```bash
kubectl create namespace netflix

# DB Credentials (points to Aurora Regional Endpoint)
kubectl create secret generic db-credentials \
  --from-literal=database-url="postgresql://netflix_admin:Password123!@<aurora-cluster-endpoint>:5432/netflix_db" \
  -n netflix

# JWT and CloudFront Key Secrets
kubectl create secret generic jwt-secrets --from-literal=jwt-secret="prod-jwt-secret-key-456" -n netflix
kubectl create secret generic cloudfront-secrets --from-file=private-key=private_key.pem -n netflix
```

### 4. Deploy Kubernetes Manifests via GitOps (ArgoCD)
1. Install **ArgoCD** and **Argo Rollouts** on both EKS clusters:
   ```bash
   # Install ArgoCD
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

   # Install Argo Rollouts
   kubectl create namespace argo-rollouts
   kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
   ```
2. Fork this repository and link your Git repository in ArgoCD.
3. Apply the Ingress, Service, and Rollout manifests located in `/k8s`. ArgoCD will synchronize state and monitor EKS health.

---

## Part 3: Practicing Canary Deployments (Argo Rollouts)

Argo Rollouts replaces the standard Kubernetes deployment for the microservices. To practice a canary release:

1. Update the Catalog Service container image version inside the Rollout spec (`k8s/rollouts/catalog-rollout.yaml`) or update it via CLI:
   ```bash
   kubectl argo rollouts set image catalog-service catalog-service=<your-registry>/netflix-catalog-service:v2 -n netflix
   ```
2. Monitor the progressive canary deployment:
   ```bash
   kubectl argo rollouts get rollout catalog-service -n netflix
   ```
3. During execution, the Rollout queries the Prometheus AnalysisTemplate (`k8s/rollouts/analysis-template.yaml`) to check HTTP request success rates. If the error rate increases, the Rollout automatically aborts and reverts back to the stable release.

---

## Part 4: Dynatrace Integration

Dynatrace is used to monitor performance and traces across the multi-region clusters:

1. **Deploy OneAgent Operator**: Install the Dynatrace Operator on both clusters. The Operator automatically injects OneAgent into all containers in the `netflix` namespace to trace DB connections, cache hits, and HTTP calls.
2. **Expose Prometheus Metrics**: Dynatrace automatically collects metrics exposed on the `/metrics` endpoint of each microservice (Catalog, User, and Streaming).
3. **Frontend Telemetry (RUM)**: In `App.tsx`, we have added simulation logs (`[Dynatrace Tracing]`). You can configure Dynatrace Real User Monitoring (RUM) by pasting the JS tag into `index.html` to trace full client-to-backend requests (Distributed Tracing).
