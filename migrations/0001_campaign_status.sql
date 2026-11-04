-- campaigns 增加狀態欄位（done / partial / failed）
ALTER TABLE campaigns ADD COLUMN status TEXT DEFAULT 'done';
