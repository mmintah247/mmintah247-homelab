# Prometheus & Grafana Installation on Kubernetes Homelab

Complete guide for installing and configuring Prometheus monitoring stack on a Kubernetes cluster using Helm.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Accessing Services](#accessing-services)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

Ensure you have the following before starting:

- ✅ Running Kubernetes cluster (k3s, minikube, or full cluster)
- ✅ `kubectl` configured and connected to your cluster
- ✅ Helm 3.x installed
- ✅ Ingress controller installed (e.g., Traefik, nginx-ingress)

### Verify Prerequisites

```bash
# Check Kubernetes cluster connectivity
kubectl get nodes

# Verify Helm version
helm version

# Verify ingress controller is running
kubectl get pods -A | grep -E 'traefik|nginx-ingress'
```

---

## Installation Steps

### Step 1: Create Namespace

Create a dedicated namespace for Prometheus components:

```bash
kubectl create namespace prometheus
```

Verify namespace creation:

```bash
kubectl get namespace prometheus
```

---

### Step 2: Add Helm Repository

Add the Prometheus Community Helm repository:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Verify the chart is available:

```bash
helm search repo prometheus-community/kube-prometheus-stack
```

---

### Step 3: Install Required CRDs

> [!IMPORTANT]
> Custom Resource Definitions (CRDs) must be installed **before** the Helm chart to avoid installation errors.

The recommended method is to pull the chart and apply CRDs from the bundled files:

```bash
# Pull the chart locally
cd prometheus-charts
helm pull prometheus-community/kube-prometheus-stack --untar

# Apply all CRDs using server-side apply
kubectl apply --server-side -f kube-prometheus-stack/charts/crds/crds/

# Verify all 10 CRDs are installed
kubectl get crds | grep monitoring.coreos.com
```

Expected CRDs:

- `alertmanagerconfigs.monitoring.coreos.com`
- `alertmanagers.monitoring.coreos.com`
- `podmonitors.monitoring.coreos.com`
- `probes.monitoring.coreos.com`
- `prometheusagents.monitoring.coreos.com`
- `prometheuses.monitoring.coreos.com`
- `prometheusrules.monitoring.coreos.com`
- `scrapeconfigs.monitoring.coreos.com`
- `servicemonitors.monitoring.coreos.com`
- `thanosrulers.monitoring.coreos.com`

---

### Step 4: Install kube-prometheus-stack

Install the monitoring stack:

```bash
helm install monitoring \
  prometheus-community/kube-prometheus-stack \
  --namespace prometheus \
  --create-namespace
```

**Installation Output:**

```
NAME: monitoring
LAST DEPLOYED: Mon Jan 19 09:32:05 2026
NAMESPACE: prometheus
STATUS: deployed
REVISION: 1
```

---

### Step 5: Verify Deployment

Check that all pods are running:

```bash
kubectl get pods -n prometheus
```

Wait for all pods to reach `Running` status. This may take 2-5 minutes.

**Expected Pods:**

- `alertmanager-monitoring-kube-prometheus-alertmanager-*` - Alert management
- `monitoring-kube-prometheus-operator-*` - Prometheus Operator
- `monitoring-kube-state-metrics-*` - Kubernetes state metrics
- `monitoring-prometheus-node-exporter-*` - Node metrics (DaemonSet)
- `monitoring-grafana-*` - Grafana dashboard
- `prometheus-monitoring-kube-prometheus-prometheus-*` - Prometheus server

Check services:

```bash
kubectl get svc -n prometheus
```

---

## Accessing Services

### Option 1: Port Forwarding (Quick Access)

#### Access Grafana

```bash
kubectl port-forward -n prometheus svc/monitoring-grafana 3000:80
```

Then open: http://localhost:3000

#### Access Prometheus

```bash
kubectl port-forward -n prometheus svc/monitoring-kube-prometheus-prometheus 9090:9090
```

Then open: http://localhost:9090

#### Access Alertmanager

```bash
kubectl port-forward -n prometheus svc/monitoring-kube-prometheus-alertmanager 9093:9093
```

Then open: http://localhost:9093

---

### Option 2: Ingress (Recommended for Homelab)

Create an ingress resource for Grafana using the [`grafana-ingress.yaml`](file:#) file:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: prometheus
spec:
  ingressClassName: traefik
  rules:
    - host: grafana.homelab.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: monitoring-grafana
                port:
                  number: 80
```

Apply the ingress:

```bash
kubectl apply -f grafana-ingress.yaml
```

Verify ingress:

```bash
kubectl get ingress -n prometheus
kubectl describe ingress grafana-ingress -n prometheus
```

---

### Step 6: Configure DNS / Hosts File

Add the following entry to your hosts file:

```bash
sudo vi /etc/hosts
```

Add this line (replace with your cluster IP):

```
192.168.64.2    grafana.homelab.local
```

> [!TIP]
> Find your cluster IP using: `kubectl get nodes -o wide`

---

### Step 7: Login to Grafana

Open your browser and navigate to:

```
http://grafana.homelab.local
```

**Default Credentials:**

- **Username:** `admin`
- **Password:** Retrieve using one of these commands:

```bash
# Method 1: Direct secret retrieval
kubectl get secret -n prometheus monitoring-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

# Method 2: From admin secret (alternative)
kubectl get secret --namespace prometheus \
  -l app.kubernetes.io/component=admin-secret \
  -o jsonpath="{.items[0].data.admin-password}" | base64 --decode ; echo
```

> [!WARNING]
> Change the default password immediately after first login via Grafana UI → Profile → Change Password

---

## Configuration

### Creating Additional Ingresses

#### Prometheus Ingress

To expose Prometheus externally, use the [`prometheus-ingress.yaml`](file:#) file:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-ingress
  namespace: prometheus
spec:
  ingressClassName: traefik
  rules:
    - host: prometheus.homelab.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: monitoring-kube-prometheus-prometheus
                port:
                  number: 9090
```

Add to `/etc/hosts`:

```
192.168.64.2    prometheus.homelab.local
```

Apply the ingress:

```bash
kubectl apply -f prometheus-ingress.yaml
```

Verify ingress:

```bash
kubectl get ingress -n prometheus
kubectl describe ingress prometheus-ingress -n prometheus
```

Access Prometheus using the URL:

```
http://prometheus.homelab.local
```

#### Alertmanager Ingress (Optional)

To expose Alertmanager, create an [`alertmanager-ingress.yaml`] (file:#) file:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alertmanager-ingress
  namespace: prometheus
spec:
  ingressClassName: traefik
  rules:
    - host: alertmanager.homelab.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: monitoring-kube-prometheus-alertmanager
                port:
                  number: 9093
```

Add to `/etc/hosts`:

```
192.168.64.2    alertmanager.homelab.local
```

Apply and verify:

```bash
kubectl apply -f alertmanager-ingress.yaml
kubectl get ingress -n prometheus
```

Access Alertmanager using the URL:

```
http://alertmanager.homelab.local
```

---

### Adding External Node Exporters

To monitor nodes outside your Kubernetes cluster (e.g., bare metal servers, VMs), you can configure Prometheus to scrape external node exporters.

> [!NOTE]
> Ensure that node_exporter is installed and running on your external nodes. The default port is `9100`.

#### Using ScrapeConfig CRD (Recommended)

Create an `external-node-exporters.yaml` file using the Prometheus Operator `ScrapeConfig` custom resource:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: ScrapeConfig
metadata:
  name: external-node-exporters
  namespace: prometheus
  labels:
    prometheus: monitoring-kube-prometheus-prometheus
spec:
  staticConfigs:
    - targets:
        - 192.168.1.20:9100
        - 192.168.1.21:9100
      labels:
        job: external-nodes
        environment: homelab
```

Apply the ScrapeConfig:

```bash
kubectl apply -f external-node-exporters.yaml
```

or

Patch the prometheus resource

```bash
kubectl patch prometheus monitoring-kube-prometheus-prometheus -n prometheus -p '{"spec":{"additionalScrapeConfigs":[{"name":"external-node-exporters","key":"external-node-exporters.yaml"}]}}'
```

Verify the ScrapeConfig was created:

```bash
kubectl get scrapeconfig -n prometheus
kubectl describe scrapeconfig external-node-exporters -n prometheus
```

#### Verify External Targets

1. Access Prometheus UI at `http://prometheus.homelab.local`
2. Navigate to **Status** → **Targets**
3. Look for the `external-nodes` job
4. Verify targets show as **UP**

#### Troubleshooting External Targets

**Issue: Targets showing as DOWN**

Check network connectivity from Prometheus pods:

```bash
# Get the Prometheus pod name
PROM_POD=$(kubectl get pod -n prometheus -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')

# Test connectivity to external node
kubectl exec -n prometheus $PROM_POD -c prometheus -- wget -O- http://192.168.1.20:9100/metrics --timeout=5
```

**Issue: Firewall blocking access**

Ensure port 9100 is open on external nodes:

```bash
# On the external node
sudo firewall-cmd --add-port=9100/tcp --permanent
sudo firewall-cmd --reload
```

---

### Enabling Persistent Storage

To persist Prometheus and Grafana data across pod restarts, create a custom [`values.yaml`] (file:#) file:

```yaml
grafana:
  persistence:
    enabled: true
    size: 10Gi
    storageClassName: local-path # or your storage class

prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
```

Upgrade the installation:

```bash
helm upgrade monitoring \
  prometheus-community/kube-prometheus-stack \
  --namespace prometheus \
  -f values.yaml
```

---

## Troubleshooting

### Issue: Pods Not Starting

Check pod status and logs:

```bash
kubectl describe pod -n prometheus <pod-name>
kubectl logs -n prometheus <pod-name>
```

### Issue: Ingress Not Working

Verify ingress controller:

```bash
kubectl get ingressclass
kubectl get pods -A | grep traefik
```

Check ingress events:

```bash
kubectl describe ingress grafana-ingress -n prometheus
```

### Issue: Cannot Access Grafana

Check service endpoints:

```bash
kubectl get endpoints -n prometheus monitoring-grafana
```

Verify pod is running:

```bash
kubectl get pods -n prometheus -l app.kubernetes.io/name=grafana
```

### Issue: Missing Metrics

Check ServiceMonitor resources:

```bash
kubectl get servicemonitor -n prometheus
```

Verify targets in Prometheus UI:

- Navigate to Prometheus → Status → Targets

---

## Notes for Homelab Clusters

> [!NOTE]
> Some alerts may fire immediately in homelab environments:
>
> - **etcd** monitoring may not work on k3s (uses embedded etcd)
> - **Control plane** components may not be accessible on managed clusters
> - This is expected behavior and can be disabled via custom alert rules

To disable specific alerts, create a custom values file:

```yaml
defaultRules:
  rules:
    etcd: false
    kubeScheduler: false
```

---

## Next Steps

### 1. Add Custom Dashboards

- Import community dashboards from [Grafana.com](https://grafana.com/grafana/dashboards/)
- Common dashboard IDs: 315 (Kubernetes cluster), 1860 (Node Exporter)

### 2. Configure Alerting

- Set up AlertManager receivers (email, Slack, PagerDuty)
- Create custom PrometheusRule resources

### 3. Monitor Applications

- Add ServiceMonitor resources for your apps
- Configure PodMonitors for pod-level metrics

### 4. Optimize Resources

- Tune retention periods based on storage capacity
- Adjust scrape intervals for less critical targets

### 5. Backup Configuration

- Export Grafana dashboards
- Backup Prometheus data to object storage (Thanos)

---

## Cleanup / Uninstallation

To remove the monitoring stack:

```bash
# Uninstall Helm release
helm uninstall monitoring -n prometheus

# Delete namespace
kubectl delete namespace prometheus

# (Optional) Remove CRDs - CAUTION: Deletes all monitoring resources!
kubectl delete crd alertmanagerconfigs.monitoring.coreos.com
kubectl delete crd alertmanagers.monitoring.coreos.com
kubectl delete crd podmonitors.monitoring.coreos.com
kubectl delete crd probes.monitoring.coreos.com
kubectl delete crd prometheusagents.monitoring.coreos.com
kubectl delete crd prometheuses.monitoring.coreos.com
kubectl delete crd prometheusrules.monitoring.coreos.com
kubectl delete crd scrapeconfigs.monitoring.coreos.com
kubectl delete crd servicemonitors.monitoring.coreos.com
kubectl delete crd thanosrulers.monitoring.coreos.com
```

---

## Additional Resources

- [kube-prometheus-stack Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Operator](https://prometheus-operator.dev/)

---
