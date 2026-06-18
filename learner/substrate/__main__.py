"""CLI entrypoint: regenerate derived views from the canonical learner state."""

from learner.substrate import sync

if __name__ == "__main__":
    sync()
    print("Derived views regenerated from learner/learning_state.yaml")
