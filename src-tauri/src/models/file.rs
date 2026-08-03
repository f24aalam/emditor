use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedMarkdownFile {
    pub title: String,
    pub file_path: String,
    pub path_key: String,
    pub content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedMarkdownFile {
    pub title: String,
    pub file_path: String,
    pub path_key: String,
}
