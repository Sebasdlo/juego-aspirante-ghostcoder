INSERT INTO Level(key,"order",rulesJson) VALUES
('junior',1,'{"total":20,"main":10,"random":5,"boss":5,"needed":12}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO Level(key,"order",rulesJson) VALUES
('senior',2,'{"total":20,"main":10,"random":5,"boss":5,"needed":12}')
ON CONFLICT (key) DO NOTHING;
