//! Emoji Manager Module
//! Handles emoji usage tracking with LRU cache and disk persistence

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Maximum number of recent emojis to track
const MAX_RECENT_EMOJIS: usize = 20;

/// Persistence filename
const EMOJI_HISTORY_FILE: &str = "emoji_history.json";

/// A single emoji usage entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmojiUsage {
    /// The emoji character
    pub char: String,
    /// Number of times used
    pub use_count: u32,
    /// Last used timestamp (Unix epoch millis)
    pub last_used: u64,
}

/// Persistent storage format
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct EmojiHistory {
    /// List of emoji usage entries
    emojis: Vec<EmojiUsage>,
}

/// Manages emoji usage tracking with LRU semantics
pub struct EmojiManager {
    /// Recent emojis ordered by recency (most recent first)
    recent: Vec<EmojiUsage>,
    /// Quick lookup by emoji char
    lookup: HashMap<String, usize>,
    /// Path to the data directory
    data_dir: PathBuf,
}

impl EmojiManager {
    /// Create a new emoji manager, loading history from disk if available
    pub fn new(data_dir: PathBuf) -> Self {
        let mut manager = Self {
            recent: Vec::with_capacity(MAX_RECENT_EMOJIS),
            lookup: HashMap::with_capacity(MAX_RECENT_EMOJIS),
            data_dir,
        };

        // Try to load existing history
        if let Err(e) = manager.load_from_disk() {
            eprintln!("[EmojiManager] Failed to load history: {}", e);
        }

        manager
    }

    /// Get the path to the history file
    fn history_path(&self) -> PathBuf {
        self.data_dir.join(EMOJI_HISTORY_FILE)
    }

    /// Load emoji history from disk
    fn load_from_disk(&mut self) -> Result<(), String> {
        let path = self.history_path();

        if !path.exists() {
            eprintln!("[EmojiManager] No history file found, starting fresh");
            return Ok(());
        }

        let content = fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;

        let history: EmojiHistory =
            serde_json::from_str(&content).map_err(|e| format!("Parse error: {}", e))?;

        // Rebuild recent list and lookup
        self.recent = history.emojis;
        self.lookup.clear();
        for (idx, entry) in self.recent.iter().enumerate() {
            self.lookup.insert(entry.char.clone(), idx);
        }

        eprintln!(
            "[EmojiManager] Loaded {} recent emojis from disk",
            self.recent.len()
        );
        Ok(())
    }

    /// Save emoji history to disk
    fn save_to_disk(&self) -> Result<(), String> {
        // Ensure data directory exists
        if !self.data_dir.exists() {
            fs::create_dir_all(&self.data_dir)
                .map_err(|e| format!("Failed to create data dir: {}", e))?;
        }

        let history = EmojiHistory {
            emojis: self.recent.clone(),
        };

        let content = serde_json::to_string_pretty(&history)
            .map_err(|e| format!("Serialize error: {}", e))?;

        fs::write(self.history_path(), content).map_err(|e| format!("Write error: {}", e))?;

        eprintln!("[EmojiManager] Saved {} emojis to disk", self.recent.len());
        Ok(())
    }

    /// Record emoji usage (LRU semantics: move to front, increment count)
    pub fn record_usage(&mut self, emoji_char: &str) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        if let Some(&idx) = self.lookup.get(emoji_char) {
            // Emoji exists - remove from current position
            let mut entry = self.recent.remove(idx);
            entry.use_count += 1;
            entry.last_used = now;

            // Insert at front
            self.recent.insert(0, entry);

            // Rebuild lookup (indices shifted)
            self.rebuild_lookup();
        } else {
            // New emoji - add to front
            let entry = EmojiUsage {
                char: emoji_char.to_string(),
                use_count: 1,
                last_used: now,
            };

            self.recent.insert(0, entry);

            // Trim to max size (LRU eviction from end)
            if self.recent.len() > MAX_RECENT_EMOJIS {
                self.recent.truncate(MAX_RECENT_EMOJIS);
            }

            self.rebuild_lookup();
        }

        // Persist to disk
        if let Err(e) = self.save_to_disk() {
            eprintln!("[EmojiManager] Failed to save history: {}", e);
        }
    }

    /// Rebuild the lookup map from the recent list
    fn rebuild_lookup(&mut self) {
        self.lookup.clear();
        for (idx, entry) in self.recent.iter().enumerate() {
            self.lookup.insert(entry.char.clone(), idx);
        }
    }

    /// Get recent emojis (most recently used first)
    pub fn get_recent(&self) -> Vec<EmojiUsage> {
        self.recent.clone()
    }

    /// Get top N most used emojis
    #[allow(dead_code)]
    pub fn get_top_used(&self, n: usize) -> Vec<EmojiUsage> {
        let mut sorted = self.recent.clone();
        sorted.sort_by(|a, b| b.use_count.cmp(&a.use_count));
        sorted.truncate(n);
        sorted
    }
}

impl Default for EmojiManager {
    fn default() -> Self {
        // Use a fallback data directory
        let data_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("win11-clipboard-history");
        Self::new(data_dir)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env::temp_dir;

    #[test]
    fn test_record_usage() {
        let data_dir = temp_dir().join("emoji_test");
        let _ = fs::remove_dir_all(&data_dir);

        let mut manager = EmojiManager::new(data_dir.clone());

        // Record some emojis
        manager.record_usage("🔥");
        manager.record_usage("😀");
        manager.record_usage("🔥");

        let recent = manager.get_recent();
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].char, "🔥"); // Most recent
        assert_eq!(recent[0].use_count, 2); // Used twice
        assert_eq!(recent[1].char, "😀");
        assert_eq!(recent[1].use_count, 1);

        // Cleanup
        let _ = fs::remove_dir_all(data_dir);
    }

    #[test]
    fn test_lru_eviction() {
        let data_dir = temp_dir().join("emoji_lru_test");
        let _ = fs::remove_dir_all(&data_dir);

        let mut manager = EmojiManager::new(data_dir.clone());

        // Add more than MAX_RECENT_EMOJIS
        for i in 0..=MAX_RECENT_EMOJIS + 5 {
            manager.record_usage(&format!("emoji{}", i));
        }

        let recent = manager.get_recent();
        assert_eq!(recent.len(), MAX_RECENT_EMOJIS);

        // Cleanup
        let _ = fs::remove_dir_all(data_dir);
    }
}
