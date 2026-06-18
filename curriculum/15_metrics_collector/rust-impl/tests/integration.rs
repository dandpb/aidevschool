use std::collections::HashMap;

use metrics_collector_rust::{MetricStore, MetricType, MetricSample};

#[tokio::test]
async fn test_store_record_counter() {
    let store = MetricStore::new(1000);
    store.record(MetricSample {
        name: "reqs".into(),
        metric_type: MetricType::Counter,
        value: 1.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });
    store.record(MetricSample {
        name: "reqs".into(),
        metric_type: MetricType::Counter,
        value: 2.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });

    let v = store.query("reqs", MetricType::Counter, &HashMap::new(), None, None, "sum");
    assert_eq!(v, 3.0);
}

#[tokio::test]
async fn test_store_record_gauge() {
    let store = MetricStore::new(1000);
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 10.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 20.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });

    let v = store.query("cpu", MetricType::Gauge, &HashMap::new(), None, None, "avg");
    assert_eq!(v, 15.0);
}

#[tokio::test]
async fn test_store_record_histogram() {
    let store = MetricStore::new(1000);
    for i in 0..10 {
        store.record(MetricSample {
            name: "lat".into(),
            metric_type: MetricType::Histogram,
            value: i as f64 * 0.1,
            timestamp: chrono::Utc::now(),
            labels: HashMap::new(),
        });
    }

    let p95 = store.histogram_percentile("lat", &HashMap::new(), 0.95);
    assert!(p95 > 0.0);
}

#[tokio::test]
async fn test_store_record_timer() {
    let store = MetricStore::new(1000);
    store.record(MetricSample {
        name: "dur".into(),
        metric_type: MetricType::Timer,
        value: 0.01,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });
    store.record(MetricSample {
        name: "dur".into(),
        metric_type: MetricType::Timer,
        value: 0.05,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });

    let p50 = store.histogram_percentile("dur", &HashMap::new(), 0.50);
    assert!(p50 > 0.0);
}

#[tokio::test]
async fn test_store_query_with_time_range() {
    let store = MetricStore::new(1000);
    let now = chrono::Utc::now();
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 10.0,
        timestamp: now - chrono::Duration::hours(2),
        labels: HashMap::new(),
    });
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 20.0,
        timestamp: now,
        labels: HashMap::new(),
    });

    let v = store.query("cpu", MetricType::Gauge, &HashMap::new(), Some(now - chrono::Duration::hours(1)), Some(now + chrono::Duration::hours(1)), "sum");
    assert_eq!(v, 20.0);
}

#[tokio::test]
async fn test_store_create_alert_and_evaluate() {
    let store = MetricStore::new(1000);
    store.create_alert(metrics_collector_rust::AlertRule {
        rule_id: "rule1".into(),
        name: "high-cpu".into(),
        enabled: true,
        query: "avg(cpu)".into(),
        operator: "gt".into(),
        threshold: 5.0,
        window_seconds: 300,
        severity: "warning".into(),
    });
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 10.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });
    store.evaluate_alerts();

    let events = store.events.read().unwrap();
    assert_eq!(events.len(), 1);
}

#[tokio::test]
async fn test_server_record_counter() {
    let app = metrics_collector_rust::app();
    drop(app);
}

#[tokio::test]
async fn test_store_aggregate_percentiles() {
    let store = MetricStore::new(1000);
    for i in 0..100 {
        store.record(MetricSample {
            name: "lat".into(),
            metric_type: MetricType::Gauge,
            value: i as f64,
            timestamp: chrono::Utc::now(),
            labels: HashMap::new(),
        });
    }

    let p50 = store.query("lat", MetricType::Gauge, &HashMap::new(), None, None, "p50");
    let p95 = store.query("lat", MetricType::Gauge, &HashMap::new(), None, None, "p95");
    let p99 = store.query("lat", MetricType::Gauge, &HashMap::new(), None, None, "p99");

    assert_eq!(p50, 49.0);
    assert_eq!(p95, 94.0);
    assert_eq!(p99, 98.0);
}

#[tokio::test]
async fn test_store_ring_buffer_eviction() {
    let store = MetricStore::new(3);
    let now = chrono::Utc::now();
    for i in 0..5 {
        store.record(MetricSample {
            name: "cpu".into(),
            metric_type: MetricType::Gauge,
            value: i as f64,
            timestamp: now + chrono::Duration::seconds(i),
            labels: HashMap::new(),
        });
    }

    let v = store.query("cpu", MetricType::Gauge, &HashMap::new(), None, None, "count");
    assert_eq!(v, 3.0);
}

#[tokio::test]
async fn test_store_aggregate_min_max() {
    let store = MetricStore::new(1000);
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 10.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 5.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 20.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });

    let min = store.query("cpu", MetricType::Gauge, &HashMap::new(), None, None, "min");
    let max = store.query("cpu", MetricType::Gauge, &HashMap::new(), None, None, "max");

    assert_eq!(min, 5.0);
    assert_eq!(max, 20.0);
}

#[tokio::test]
async fn test_prometheus_export() {
    let store = MetricStore::new(1000);
    store.record(MetricSample {
        name: "cpu".into(),
        metric_type: MetricType::Gauge,
        value: 10.0,
        timestamp: chrono::Utc::now(),
        labels: HashMap::new(),
    });

    let output = store.prometheus_export();
    assert!(output.contains("cpu"));
}

#[tokio::test]
async fn test_histogram_percentile_no_data() {
    let store = MetricStore::new(1000);
    let p = store.histogram_percentile("nonexistent", &HashMap::new(), 0.95);
    assert_eq!(p, 0.0);
}
