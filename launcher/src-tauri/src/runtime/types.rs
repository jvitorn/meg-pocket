use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeMode {
    Docker,
    Portable,
}

impl RuntimeMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Docker => "docker",
            Self::Portable => "portable",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Docker => "Docker",
            Self::Portable => "Portátil",
        }
    }
}
