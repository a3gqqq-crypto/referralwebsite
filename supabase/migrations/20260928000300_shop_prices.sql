-- Shop prices: everything costs at least $2.49. Each old price moves up a
-- tier, so the order (common < rare < epic < legendary) stays the same.

update public.cosmetics set price_cents = case price_cents
  when 99 then 249
  when 149 then 299
  when 199 then 349
  when 249 then 399
  when 299 then 449
  when 349 then 499
  when 399 then 599
  when 499 then 699
  when 599 then 799
  else greatest(price_cents, 249)
end
where price_cents is not null;
