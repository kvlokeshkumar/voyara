-- OPTIONAL test data. Fake Cognito subs; never use in production.
INSERT INTO users (id, cognito_sub, email, name, role) VALUES
 (9001, '00000000-0000-0000-0000-000000000001', 'demo.user@example.com', 'Demo User', 'user'),
 (9002, '00000000-0000-0000-0000-000000000002', 'demo.admin@example.com', 'Demo Admin', 'admin');

INSERT INTO trips (id, user_id, origin, destination, start_date, end_date, travelers, notes) VALUES
 (9101, 9001, 'Chennai', 'Bali, Indonesia', '2026-12-10', '2026-12-14', 2, 'Beach trip'),
 (9102, 9001, 'Chennai', 'Goa', '2026-11-02', '2026-11-05', 4, 'Friends trip'),
 (9103, 9002, 'Mumbai', 'Jaipur', '2027-01-15', '2027-01-18', 1, NULL);

INSERT INTO budgets (trip_id, total_budget, transportation, accommodation, meals, activities, miscellaneous, alerts_enabled) VALUES
 (9101, 50000.00, 20000.00, 15000.00, 8000.00, 5000.00, 2000.00, 1),
 (9102, 20000.00, 6000.00, 7000.00, 4000.00, 2000.00, 1000.00, 0),
 (9103, 10000.00, 3000.00, 3000.00, 2000.00, 1500.00, 500.00, 0);

INSERT INTO expenses (trip_id, user_id, category, description, amount, expense_date) VALUES
 (9101, 9001, 'transportation', 'Flight to Bali', 18000.00, '2026-10-01'),
 (9101, 9001, 'accommodation', 'Hotel deposit', 12000.00, '2026-10-02'),
 (9101, 9001, 'meals', 'Welcome dinner', 3500.00, '2026-12-10'),
 (9101, 9001, 'activities', 'Surf lesson', 4500.00, '2026-12-11'),
 (9102, 9001, 'transportation', 'Train tickets', 5000.00, '2026-10-05'),
 (9102, 9001, 'accommodation', 'Beach hostel', 9000.00, '2026-10-06'),
 (9102, 9001, 'meals', 'Seafood dinner', 7000.00, '2026-11-03'),
 (9103, 9002, 'transportation', 'Bus', 1200.00, '2026-10-10');

INSERT INTO itineraries (id, trip_id) VALUES (9201, 9101);
INSERT INTO itinerary_activities (itinerary_id, day_number, activity_time, title, planned_cost, sort_order) VALUES
 (9201, 1, '09:00', 'Airport transfer', 1500.00, 0),
 (9201, 1, '19:00', 'Dinner at Jimbaran Bay', 3500.00, 1),
 (9201, 2, '10:00', 'Surf lesson', 4500.00, 0),
 (9201, 3, '08:00', 'Temple tour', 2000.00, 0);
