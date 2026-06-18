//! Strategy for resolving the client identifier used by the rate limiter.
//!
//! The default production adapter reads the client IP from axum's
//! [`ConnectInfo`] request extension. Tests can inject a different strategy
//! (for example, a fixed key) so they do not depend on the transport layer.

use std::net::{IpAddr, SocketAddr};

use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::Request;

/// How the rate-limiting layer turns an incoming request into a client key.
///
/// Returning `Option<IpAddr>` keeps the strategy honest about cases where no
/// key can be resolved. Callers (the middleware and the status handler) decide
/// how to handle a missing key.
pub trait ClientKeyStrategy: Send + Sync + std::fmt::Debug + 'static {
    /// Extract the client key from the request.
    fn extract_key(&self, req: &Request<Body>) -> Option<IpAddr>;
}

/// Production adapter: reads the socket address that axum's
/// `into_make_service_with_connect_info` places in the request extensions.
#[derive(Debug, Clone, Copy, Default)]
pub struct ConnectInfoClientKey;

impl ClientKeyStrategy for ConnectInfoClientKey {
    fn extract_key(&self, req: &Request<Body>) -> Option<IpAddr> {
        req.extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ci| ci.0.ip())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{Ipv4Addr, SocketAddr};

    #[test]
    fn connect_info_key_extracts_ip() {
        let req = Request::builder()
            .extension(ConnectInfo(SocketAddr::from(([192, 168, 1, 2], 1234))))
            .body(Body::empty())
            .unwrap();

        let key = ConnectInfoClientKey.extract_key(&req);
        assert_eq!(key, Some(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 2))));
    }

    #[test]
    fn connect_info_key_returns_none_when_missing() {
        let req = Request::builder().body(Body::empty()).unwrap();
        assert!(ConnectInfoClientKey.extract_key(&req).is_none());
    }
}
