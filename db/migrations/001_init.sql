CREATE TABLE bookmarks (
	id text PRIMARY KEY,
	url text NOT NULL,
	title text NOT NULL DEFAULT '',
	notes text NOT NULL DEFAULT '',
	category text NOT NULL DEFAULT '',
	tags text[] NOT NULL DEFAULT '{}',
	clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL
);

CREATE INDEX bookmarks_updated_at_idx ON bookmarks (updated_at DESC);
CREATE INDEX bookmarks_clicks_updated_at_idx ON bookmarks (clicks DESC, updated_at DESC);
