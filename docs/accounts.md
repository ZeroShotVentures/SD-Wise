# Accounts

Every person in the graph has an account, and every account is one person: the owners of a fact are the accounts that can sign in and see it. All 312 share the password `password123`. Seeded by `pnpm db:seed:accounts` (or `pnpm db:seed:demo`, which also adds the demo questions).

"Owns" counts the facts that person was part of; "Can see" counts the facts that aren't locked in their graph (owned, shared with them, or public) out of 4300. Answers to questions add a few on top.

Generated from the fixtures by `pnpm db:seed:accounts --docs`; don't edit by hand.

| Name | Email | Role | Department | Owns | Can see |
| --- | --- | --- | --- | --: | --: |
| Dario | `dario@sdwise.be` | Product lead | IT | 6 | 1239 |
| Victor | `victor@sdwise.be` | Backend engineer | IT | 9 | 1240 |
| Julien | `julien@sdwise.be` | Data engineer | IT | 7 | 1240 |
| Timon | `timon@sdwise.be` | Marketing lead | MARKETING | 5 | 1238 |
| Sofie Peeters | `sofie@sdwise.be` | HR business partner | HR | 6 | 1238 |
| Bram De Smet | `bram@sdwise.be` | Account manager | SALES | 4 | 1238 |
| Lotte Janssens | `lotte@sdwise.be` | Financial controller | FINANCE | 6 | 1241 |
| Pieter Claes | `pieter@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 4 | 1236 |
| An Maes | `an@sdwise.be` | Payroll legal expert | HR | 3 | 1238 |
| Kobe Verdonck | `kobe@sdwise.be` | Platform lead | IT | 27 | 1252 |
| Filip Dierckx | `filip@sdwise.be` | Payroll operations lead | PRODUCTION | 24 | 1254 |
| Olivier Pauwels | `olivier.pauwels@sdwise.be` | Payroll consultant | PRODUCTION | 51 | 1269 |
| Ruben Martens | `ruben.martens@sdwise.be` | Senior payroll consultant | PRODUCTION | 52 | 1269 |
| Nele Aerts | `nele.aerts@sdwise.be` | Payroll team lead | PRODUCTION | 53 | 1274 |
| Nele Willems | `nele.willems@sdwise.be` | Payroll quality analyst | PRODUCTION | 62 | 1278 |
| Hanne Lambert | `hanne.lambert@sdwise.be` | Payroll consultant | PRODUCTION | 49 | 1267 |
| Ine Callens | `ine.callens@sdwise.be` | Senior payroll consultant | PRODUCTION | 49 | 1261 |
| Lotte Vandenberghe | `lotte.vandenberghe@sdwise.be` | Payroll team lead | PRODUCTION | 53 | 1272 |
| Tim Smets | `tim.smets@sdwise.be` | Payroll quality analyst | PRODUCTION | 50 | 1273 |
| Sanne Timmermans | `sanne.timmermans@sdwise.be` | Payroll consultant | PRODUCTION | 59 | 1276 |
| Griet Renard | `griet.renard@sdwise.be` | Senior payroll consultant | PRODUCTION | 45 | 1264 |
| Hanne De Smet | `hanne.desmet@sdwise.be` | Payroll team lead | PRODUCTION | 57 | 1268 |
| Griet Coppens | `griet.coppens@sdwise.be` | Payroll quality analyst | PRODUCTION | 49 | 1264 |
| Jan Dubois | `jan.dubois@sdwise.be` | Payroll consultant | PRODUCTION | 51 | 1267 |
| Sanne Willems | `sanne.willems@sdwise.be` | Senior payroll consultant | PRODUCTION | 47 | 1265 |
| Els Verbruggen | `els.verbruggen@sdwise.be` | Payroll team lead | PRODUCTION | 48 | 1272 |
| Katrien Wouters | `katrien.wouters@sdwise.be` | Payroll quality analyst | PRODUCTION | 35 | 1255 |
| Joris Aerts | `joris.aerts@sdwise.be` | Payroll consultant | PRODUCTION | 42 | 1268 |
| Julie Dubois | `julie.dubois@sdwise.be` | Senior payroll consultant | PRODUCTION | 50 | 1268 |
| Pascal Goossens | `pascal.goossens@sdwise.be` | Payroll team lead | PRODUCTION | 53 | 1273 |
| Eline Pauwels | `eline.pauwels@sdwise.be` | Payroll quality analyst | PRODUCTION | 37 | 1261 |
| Sanne Van den Berg | `sanne.vandenberg@sdwise.be` | Payroll consultant | PRODUCTION | 55 | 1278 |
| Joke Desmet | `joke.desmet@sdwise.be` | Senior payroll consultant | PRODUCTION | 57 | 1277 |
| Sven Moens | `sven.moens@sdwise.be` | Payroll team lead | PRODUCTION | 58 | 1279 |
| Jonas Janssens | `jonas.janssens@sdwise.be` | Payroll quality analyst | PRODUCTION | 57 | 1272 |
| Silke Aerts | `silke.aerts@sdwise.be` | Payroll consultant | PRODUCTION | 48 | 1271 |
| Laurent Coppens | `laurent.coppens@sdwise.be` | Senior payroll consultant | PRODUCTION | 56 | 1277 |
| Pauline Timmermans | `pauline.timmermans@sdwise.be` | Payroll team lead | PRODUCTION | 49 | 1269 |
| Joris Thys | `joris.thys@sdwise.be` | Backend engineer | IT | 52 | 1272 |
| Maarten Stevens | `maarten.stevens@sdwise.be` | Frontend engineer | IT | 51 | 1266 |
| Sven Wouters | `sven.wouters@sdwise.be` | DevOps engineer | IT | 57 | 1269 |
| Lien Cools | `lien.cools@sdwise.be` | QA engineer | IT | 48 | 1263 |
| Julie De Smet | `julie.desmet@sdwise.be` | Data engineer | IT | 51 | 1268 |
| Elise Wouters | `elise.wouters@sdwise.be` | Engineering manager | IT | 57 | 1276 |
| Koen Van Damme | `koen.vandamme@sdwise.be` | Backend engineer | IT | 48 | 1266 |
| Mieke Bogaert | `mieke.bogaert@sdwise.be` | Frontend engineer | IT | 64 | 1276 |
| Lien Jacobs | `lien.jacobs@sdwise.be` | DevOps engineer | IT | 43 | 1270 |
| Fien De Backer | `fien.debacker@sdwise.be` | QA engineer | IT | 47 | 1271 |
| Pauline Michiels | `pauline.michiels@sdwise.be` | Data engineer | IT | 53 | 1274 |
| Olivier Aerts | `olivier.aerts@sdwise.be` | Engineering manager | IT | 54 | 1268 |
| Marie Lemmens | `marie.lemmens@sdwise.be` | Backend engineer | IT | 46 | 1266 |
| Maarten Dupont | `maarten.dupont@sdwise.be` | Frontend engineer | IT | 63 | 1278 |
| Els Dubois | `els.dubois@sdwise.be` | DevOps engineer | IT | 48 | 1265 |
| Sofie Vermeulen | `sofie.vermeulen@sdwise.be` | QA engineer | IT | 44 | 1262 |
| Emma Dupont | `emma.dupont@sdwise.be` | Data engineer | IT | 56 | 1275 |
| Charlotte Verbruggen | `charlotte.verbruggen@sdwise.be` | Engineering manager | IT | 48 | 1271 |
| Marie Aerts | `marie.aerts@sdwise.be` | Backend engineer | IT | 59 | 1275 |
| Sander Dupont | `sander.dupont@sdwise.be` | Frontend engineer | IT | 60 | 1279 |
| Bram Hoefkens | `bram.hoefkens@sdwise.be` | DevOps engineer | IT | 52 | 1270 |
| Lars Renard | `lars.renard@sdwise.be` | QA engineer | IT | 56 | 1269 |
| Wim De Vos | `wim.devos@sdwise.be` | Data engineer | IT | 45 | 1271 |
| Katrien Maes | `katrien.maes@sdwise.be` | Engineering manager | IT | 50 | 1273 |
| Isabelle Cools | `isabelle.cools@sdwise.be` | Backend engineer | IT | 57 | 1279 |
| Koen Van Acker | `koen.vanacker@sdwise.be` | Frontend engineer | IT | 55 | 1275 |
| Lars Bogaert | `lars.bogaert@sdwise.be` | DevOps engineer | IT | 47 | 1270 |
| Bart Renard | `bart.renard@sdwise.be` | Support agent | CUSTOMER_SERVICE | 52 | 1273 |
| Camille Cools | `camille.cools@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 44 | 1266 |
| Lore Lambert | `lore.lambert@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 54 | 1276 |
| Jeroen Verbruggen | `jeroen.verbruggen@sdwise.be` | Support agent | CUSTOMER_SERVICE | 58 | 1272 |
| Arne Beckers | `arne.beckers@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 48 | 1265 |
| Inge Hoefkens | `inge.hoefkens@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 53 | 1273 |
| Katrien De Cock | `katrien.decock@sdwise.be` | Support agent | CUSTOMER_SERVICE | 45 | 1267 |
| Ilse Hendrickx | `ilse.hendrickx@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 52 | 1280 |
| Tom Van Acker | `tom.vanacker@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 48 | 1267 |
| Eline Willems | `eline.willems@sdwise.be` | Support agent | CUSTOMER_SERVICE | 54 | 1276 |
| Niels Gielen | `niels.gielen@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 56 | 1281 |
| Ine Heyvaert | `ine.heyvaert@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 56 | 1274 |
| Lore Heyvaert | `lore.heyvaert@sdwise.be` | Support agent | CUSTOMER_SERVICE | 50 | 1272 |
| Lore Gielen | `lore.gielen@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 41 | 1259 |
| Marie Janssens | `marie.janssens@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 45 | 1264 |
| Charlotte Smets | `charlotte.smets@sdwise.be` | Support agent | CUSTOMER_SERVICE | 49 | 1268 |
| Mathieu Mertens | `mathieu.mertens@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 55 | 1274 |
| Katrien Van Damme | `katrien.vandamme@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 35 | 1262 |
| Nicolas Hendrickx | `nicolas.hendrickx@sdwise.be` | Support agent | CUSTOMER_SERVICE | 43 | 1264 |
| Julie De Vos | `julie.devos@sdwise.be` | Support team lead | CUSTOMER_SERVICE | 53 | 1270 |
| Inge Heyvaert | `inge.heyvaert@sdwise.be` | Customer success manager | CUSTOMER_SERVICE | 51 | 1273 |
| Jan Van Acker | `jan.vanacker@sdwise.be` | Account manager | SALES | 51 | 1266 |
| Els Mertens | `els.mertens@sdwise.be` | Sales executive | SALES | 48 | 1263 |
| Tom Dupont | `tom.dupont@sdwise.be` | Sales engineer | SALES | 51 | 1268 |
| Hanne Cools | `hanne.cools@sdwise.be` | Account manager | SALES | 54 | 1277 |
| Julie Bogaert | `julie.bogaert@sdwise.be` | Sales executive | SALES | 49 | 1270 |
| Julie Aerts | `julie.aerts@sdwise.be` | Sales engineer | SALES | 50 | 1271 |
| Bram Wuyts | `bram.wuyts@sdwise.be` | Account manager | SALES | 44 | 1265 |
| Sara De Cock | `sara.decock@sdwise.be` | Sales executive | SALES | 50 | 1270 |
| Niels Timmermans | `niels.timmermans@sdwise.be` | Sales engineer | SALES | 52 | 1265 |
| Olivier Gielen | `olivier.gielen@sdwise.be` | Account manager | SALES | 61 | 1275 |
| Wim Peeters | `wim.peeters@sdwise.be` | Sales executive | SALES | 69 | 1277 |
| Nicolas Van Damme | `nicolas.vandamme@sdwise.be` | Sales engineer | SALES | 49 | 1272 |
| Tess Verbruggen | `tess.verbruggen@sdwise.be` | Account manager | SALES | 48 | 1269 |
| Hugo Maes | `hugo.maes@sdwise.be` | Sales executive | SALES | 55 | 1281 |
| Hugo Segers | `hugo.segers@sdwise.be` | Sales engineer | SALES | 55 | 1268 |
| Thomas Leclercq | `thomas.leclercq@sdwise.be` | HR business partner | HR | 65 | 1284 |
| Camille Callens | `camille.callens@sdwise.be` | Recruiter | HR | 56 | 1275 |
| Isabelle Coppens | `isabelle.coppens@sdwise.be` | Payroll legal expert | HR | 51 | 1271 |
| Sven Janssens | `sven.janssens@sdwise.be` | HR business partner | HR | 49 | 1270 |
| Ine Cools | `ine.cools@sdwise.be` | Recruiter | HR | 61 | 1279 |
| Bram Willems | `bram.willems@sdwise.be` | Payroll legal expert | HR | 45 | 1271 |
| Nicolas Vandenberghe | `nicolas.vandenberghe@sdwise.be` | HR business partner | HR | 47 | 1269 |
| Nadia Wuyts | `nadia.wuyts@sdwise.be` | Recruiter | HR | 36 | 1259 |
| Lars Moens | `lars.moens@sdwise.be` | Payroll legal expert | HR | 47 | 1267 |
| Thomas De Smet | `thomas.desmet@sdwise.be` | HR business partner | HR | 61 | 1280 |
| Hanne Vermeulen | `hanne.vermeulen@sdwise.be` | Recruiter | HR | 59 | 1272 |
| Pauline Beckers | `pauline.beckers@sdwise.be` | Payroll legal expert | HR | 52 | 1272 |
| Lars Cools | `lars.cools@sdwise.be` | Financial controller | FINANCE | 46 | 1259 |
| Annelies Stevens | `annelies.stevens@sdwise.be` | FP&A analyst | FINANCE | 49 | 1267 |
| Hugo Wuyts | `hugo.wuyts@sdwise.be` | Financial controller | FINANCE | 47 | 1264 |
| Julie Renard | `julie.renard@sdwise.be` | FP&A analyst | FINANCE | 41 | 1262 |
| Koen Janssens | `koen.janssens@sdwise.be` | Financial controller | FINANCE | 43 | 1266 |
| Pauline Desmet | `pauline.desmet@sdwise.be` | FP&A analyst | FINANCE | 49 | 1268 |
| Julie Pauwels | `julie.pauwels@sdwise.be` | Financial controller | FINANCE | 50 | 1268 |
| Nadia Callens | `nadia.callens@sdwise.be` | FP&A analyst | FINANCE | 57 | 1276 |
| Thomas Claes | `thomas.claes@sdwise.be` | Financial controller | FINANCE | 60 | 1274 |
| Julie Van den Berg | `julie.vandenberg@sdwise.be` | Accountant | ACCOUNTING | 42 | 1265 |
| Els Bogaert | `els.bogaert@sdwise.be` | Billing specialist | ACCOUNTING | 38 | 1258 |
| Eline Vermeulen | `eline.vermeulen@sdwise.be` | Accountant | ACCOUNTING | 46 | 1270 |
| Griet Mertens | `griet.mertens@sdwise.be` | Billing specialist | ACCOUNTING | 47 | 1269 |
| Laurent Verbruggen | `laurent.verbruggen@sdwise.be` | Accountant | ACCOUNTING | 46 | 1263 |
| Tess De Smet | `tess.desmet@sdwise.be` | Billing specialist | ACCOUNTING | 52 | 1271 |
| Tim Vandenberghe | `tim.vandenberghe@sdwise.be` | Accountant | ACCOUNTING | 50 | 1269 |
| Sander Smets | `sander.smets@sdwise.be` | Billing specialist | ACCOUNTING | 50 | 1272 |
| Nadia Jacobs | `nadia.jacobs@sdwise.be` | Accountant | ACCOUNTING | 59 | 1273 |
| Jeroen Gielen | `jeroen.gielen@sdwise.be` | Content marketer | MARKETING | 50 | 1265 |
| Pascal Michiels | `pascal.michiels@sdwise.be` | Product marketer | MARKETING | 51 | 1276 |
| Lien Van den Berg | `lien.vandenberg@sdwise.be` | Events manager | MARKETING | 41 | 1258 |
| Fatima Lambert | `fatima.lambert@sdwise.be` | Content marketer | MARKETING | 38 | 1264 |
| Camille Maes | `camille.maes@sdwise.be` | Product marketer | MARKETING | 51 | 1272 |
| Fatima De Cock | `fatima.decock@sdwise.be` | Events manager | MARKETING | 50 | 1269 |
| Sara De Backer | `sara.debacker@sdwise.be` | Content marketer | MARKETING | 53 | 1276 |
| Wim Heyvaert | `wim.heyvaert@sdwise.be` | Product marketer | MARKETING | 37 | 1262 |
| Isabelle Timmermans | `isabelle.timmermans@sdwise.be` | Internal auditor | AUDIT | 59 | 1275 |
| Griet Verhaegen | `griet.verhaegen@sdwise.be` | Compliance officer | AUDIT | 56 | 1277 |
| Hugo Leclercq | `hugo.leclercq@sdwise.be` | Internal auditor | AUDIT | 44 | 1265 |
| Fatima Declercq | `fatima.declercq@sdwise.be` | Compliance officer | AUDIT | 50 | 1265 |
| Dries Segers | `dries.segers@sdwise.be` | Internal auditor | AUDIT | 48 | 1263 |
| Lien Wouters | `lien.wouters@sdwise.be` | Compliance officer | AUDIT | 37 | 1263 |
| Annelies Dubois | `annelies.dubois@sdwise.be` | Security engineer | SECURITY | 51 | 1274 |
| Tess Timmermans | `tess.timmermans@sdwise.be` | Security officer | SECURITY | 51 | 1270 |
| Lena Michiels | `lena.michiels@sdwise.be` | Security engineer | SECURITY | 50 | 1269 |
| Eline Van den Berg | `eline.vandenberg@sdwise.be` | Security officer | SECURITY | 48 | 1268 |
| Bart Hermans | `bart.hermans@sdwise.be` | Security engineer | SECURITY | 44 | 1268 |
| Daan Wouters | `daan.wouters@sdwise.be` | Security officer | SECURITY | 50 | 1270 |
| Nicolas Segers | `nicolas.segers@sdwise.be` | Print and mail coordinator | LOGISTICS | 38 | 1258 |
| Lotte De Vos | `lotte.devos@sdwise.be` | Facilities coordinator | LOGISTICS | 44 | 1267 |
| Jeroen Wuyts | `jeroen.wuyts@sdwise.be` | Print and mail coordinator | LOGISTICS | 51 | 1266 |
| Isabelle De Vos | `isabelle.devos@sdwise.be` | Facilities coordinator | LOGISTICS | 38 | 1265 |
| Jonas Dupont | `jonas.dupont@sdwise.be` | Print and mail coordinator | LOGISTICS | 57 | 1273 |
| Ruben Pauwels | `ruben.pauwels@sdwise.be` | Executive assistant | SECRETARIAL | 42 | 1259 |
| Niels Wuyts | `niels.wuyts@sdwise.be` | Executive assistant | SECRETARIAL | 42 | 1264 |
| Amélie Goossens | `amelie.goossens@sdwise.be` | Executive assistant | SECRETARIAL | 42 | 1264 |
| Lena De Cock | `lena.decock@sdwise.be` | Facilities technician | MAINTENANCE | 39 | 1260 |
| Sara De Smet | `sara.desmet@sdwise.be` | Facilities technician | MAINTENANCE | 30 | 1252 |
| Annelies Dupont | `annelies.dupont@sdwise.be` | Receptionist | RECEPTION | 35 | 1258 |
| Bart Stevens | `bart.stevens@sdwise.be` | Receptionist | RECEPTION | 44 | 1262 |
| Bart Goossens | `bart.goossens@sdwise.be` | Payroll Processing Specialist | HR | 16 | 1251 |
| Charlotte Wuyts | `charlotte.wuyts@sdwise.be` | Workforce Management Specialist | IT | 5 | 1240 |
| Thomas Maes | `thomas.maes@sdwise.be` | IT Support Technician | IT | 7 | 1242 |
| Els Hoefkens | `els.hoefkens@sdwise.be` | Workforce Management Specialist | IT | 5 | 1240 |
| Bram Timmermans | `bram.timmermans@sdwise.be` | Junior Payroll Support Analyst | IT | 4 | 1239 |
| Laurent Mertens | `laurent.mertens@sdwise.be` | Data Quality Technician | IT | 3 | 1238 |
| Maarten Jacobs | `maarten.jacobs@sdwise.be` | Tier-1 Helpdesk Agent (HR Services) | CUSTOMER_SERVICE | 4 | 1239 |
| Mieke Dubois | `mieke.dubois@sdwise.be` | Business Development Representative | SALES | 10 | 1245 |
| Amélie Beckers | `amelie.beckers@sdwise.be` | Marketing Specialist | MARKETING | 22 | 1257 |
| Griet Van Acker | `griet.vanacker@sdwise.be` | Data Quality Technician | IT | 4 | 1239 |
| Hanne Verbruggen | `hanne.verbruggen@sdwise.be` | Marketing Specialist | MARKETING | 24 | 1259 |
| Mieke Pauwels | `mieke.pauwels@sdwise.be` | Payroll Accounting Operator | ACCOUNTING | 19 | 1254 |
| Hanne Aerts | `hanne.aerts@sdwise.be` | Junior Payroll Support Analyst | IT | 6 | 1241 |
| Griet Hendrickx | `griet.hendrickx@sdwise.be` | Junior Payroll Sales Consultant | SALES | 10 | 1245 |
| Koen Hermans | `koen.hermans@sdwise.be` | Payroll Logistics Operator | LOGISTICS | 23 | 1258 |
| Emma Desmet | `emma.desmet@sdwise.be` | Payroll Processing Associate | PRODUCTION | 7 | 1242 |
| Pieter Van den Berg | `pieter.vandenberg@sdwise.be` | Quality Assurance Reviewer (Payroll) | CUSTOMER_SERVICE | 7 | 1242 |
| Ruben Callens | `ruben.callens@sdwise.be` | Senior Payroll Consultant | IT | 9 | 1244 |
| Niels Beckers | `niels.beckers@sdwise.be` | Payroll Processing Associate | PRODUCTION | 9 | 1244 |
| Nicolas Pauwels | `nicolas.pauwels@sdwise.be` | Payroll Accounting Operator | ACCOUNTING | 17 | 1252 |
| Lore Willems | `lore.willems@sdwise.be` | Payroll Processing Associate | PRODUCTION | 5 | 1240 |
| Jan Hendrickx | `jan.hendrickx@sdwise.be` | Payroll Operations Analyst | CUSTOMER_SERVICE | 3 | 1238 |
| Maarten Segers | `maarten.segers@sdwise.be` | Business Development Representative | SALES | 10 | 1245 |
| Els Timmermans | `els.timmermans@sdwise.be` | Payroll Officer | SECRETARIAL | 22 | 1257 |
| Daan Martens | `daan.martens@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 1 | 1236 |
| Silke Dupont | `silke.dupont@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 3 | 1238 |
| Marie Verbruggen | `marie.verbruggen@sdwise.be` | Payroll Solutions Specialist | SALES | 11 | 1246 |
| Lore Dupont | `lore.dupont@sdwise.be` | Data Quality Technician | IT | 2 | 1237 |
| Eline Timmermans | `eline.timmermans@sdwise.be` | Junior Payroll Support Analyst | IT | 7 | 1242 |
| Julie Leclercq | `julie.leclercq@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 4 | 1239 |
| Katrien Goossens | `katrien.goossens@sdwise.be` | IT Support Technician | IT | 4 | 1239 |
| Mieke De Smet | `mieke.desmet@sdwise.be` | Workforce Management Specialist | IT | 4 | 1239 |
| Charlotte Gielen | `charlotte.gielen@sdwise.be` | Senior Payroll Consultant | IT | 5 | 1240 |
| Tess Stevens | `tess.stevens@sdwise.be` | Junior Payroll Audit Analyst | AUDIT | 23 | 1258 |
| Thomas Van den Berg | `thomas.vandenberg@sdwise.be` | IT Support Technician | IT | 4 | 1239 |
| Inge Bosmans | `inge.bosmans@sdwise.be` | Payroll Operations Coordinator | PRODUCTION | 4 | 1239 |
| Tim Claes | `tim.claes@sdwise.be` | Payroll Processing Associate | PRODUCTION | 6 | 1241 |
| Ilse Vermeulen | `ilse.vermeulen@sdwise.be` | Tier-1 Helpdesk Agent (HR Services) | CUSTOMER_SERVICE | 3 | 1238 |
| Tim Van Damme | `tim.vandamme@sdwise.be` | Tier-1 Helpdesk Agent (HR Services) | CUSTOMER_SERVICE | 5 | 1240 |
| Bart Hoefkens | `bart.hoefkens@sdwise.be` | Payroll Processing Associate | PRODUCTION | 5 | 1240 |
| Lien Vermeulen | `lien.vermeulen@sdwise.be` | Junior Payroll Support Analyst | IT | 2 | 1237 |
| Niels Coppens | `niels.coppens@sdwise.be` | HR Service Advisor | HR | 20 | 1255 |
| Yannick Wuyts | `yannick.wuyts@sdwise.be` | Payroll Processing Specialist | HR | 22 | 1257 |
| Pieter Pauwels | `pieter.pauwels@sdwise.be` | Junior Payroll Support Analyst | IT | 5 | 1240 |
| Tom Maes | `tom.maes@sdwise.be` | Payroll Compliance Specialist | PRODUCTION | 4 | 1239 |
| Kaat Lambert | `kaat.lambert@sdwise.be` | Tier-1 Helpdesk Agent (HR Services) | CUSTOMER_SERVICE | 4 | 1239 |
| Hanne Declercq | `hanne.declercq@sdwise.be` | Financial Controller | FINANCE | 17 | 1252 |
| Lore Pauwels | `lore.pauwels@sdwise.be` | Payroll Processing Expert | CUSTOMER_SERVICE | 1 | 1236 |
| Elise Peeters | `elise.peeters@sdwise.be` | Payroll Operations Analyst | CUSTOMER_SERVICE | 5 | 1240 |
| Hugo Desmet | `hugo.desmet@sdwise.be` | Quality Assurance Reviewer (Payroll) | CUSTOMER_SERVICE | 4 | 1239 |
| Ilse Jacobs | `ilse.jacobs@sdwise.be` | SOC Analyst | SECURITY | 23 | 1258 |
| Joris Janssens | `joris.janssens@sdwise.be` | Data Quality Technician | IT | 10 | 1245 |
| Maarten Bosmans | `maarten.bosmans@sdwise.be` | Payroll Processing Specialist | HR | 21 | 1256 |
| Nicolas Goossens | `nicolas.goossens@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 2 | 1237 |
| Annelies Goossens | `annelies.goossens@sdwise.be` | Junior Payroll Sales Consultant | SALES | 7 | 1242 |
| Camille Hoefkens | `camille.hoefkens@sdwise.be` | Payroll Operations Team Lead | IT | 7 | 1242 |
| Lena De Backer | `lena.debacker@sdwise.be` | Quality Assurance Analyst – Payroll | PRODUCTION | 4 | 1239 |
| Marie Willems | `marie.willems@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 1 | 1236 |
| Jeroen Timmermans | `jeroen.timmermans@sdwise.be` | Key Account Manager | SALES | 9 | 1244 |
| Stijn Pauwels | `stijn.pauwels@sdwise.be` | Quality Assurance Analyst – Payroll | PRODUCTION | 9 | 1244 |
| Hugo Janssens | `hugo.janssens@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 4 | 1239 |
| Joke Van Acker | `joke.vanacker@sdwise.be` | Payroll Compliance Specialist | PRODUCTION | 6 | 1241 |
| Amélie Lemmens | `amelie.lemmens@sdwise.be` | Payroll Compliance Specialist | PRODUCTION | 5 | 1240 |
| Hanne Heyvaert | `hanne.heyvaert@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 4 | 1239 |
| Femke Martens | `femke.martens@sdwise.be` | Payroll Operations Analyst | CUSTOMER_SERVICE | 4 | 1239 |
| Thomas Bosmans | `thomas.bosmans@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 2 | 1237 |
| Maarten De Cock | `maarten.decock@sdwise.be` | Quality Assurance Reviewer (Payroll) | CUSTOMER_SERVICE | 7 | 1242 |
| Jonas Dubois | `jonas.dubois@sdwise.be` | Team Lead – Payroll Processing | PRODUCTION | 7 | 1242 |
| Nicolas Claes | `nicolas.claes@sdwise.be` | Marketing Specialist | MARKETING | 23 | 1258 |
| Jan Moens | `jan.moens@sdwise.be` | Payroll Processing Associate | PRODUCTION | 3 | 1238 |
| Fatima Jacobs | `fatima.jacobs@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 2 | 1237 |
| Inge Beckers | `inge.beckers@sdwise.be` | Payroll Logistics Operator | LOGISTICS | 23 | 1258 |
| Wim Timmermans | `wim.timmermans@sdwise.be` | Payroll Processing Expert | CUSTOMER_SERVICE | 4 | 1239 |
| Griet Declercq | `griet.declercq@sdwise.be` | Workforce Data Administrator | PRODUCTION | 2 | 1237 |
| Ruben Segers | `ruben.segers@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 6 | 1241 |
| Pauline Dubois | `pauline.dubois@sdwise.be` | Payroll Escalation Specialist | PRODUCTION | 6 | 1241 |
| Joke Maes | `joke.maes@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 4 | 1239 |
| Yannick Hendrickx | `yannick.hendrickx@sdwise.be` | Payroll Compliance Specialist | PRODUCTION | 2 | 1237 |
| Mieke Lambert | `mieke.lambert@sdwise.be` | Payroll Specialist | FINANCE | 17 | 1252 |
| Fien Coppens | `fien.coppens@sdwise.be` | Workforce Data Administrator | PRODUCTION | 3 | 1238 |
| Sander Bogaert | `sander.bogaert@sdwise.be` | Junior Payroll Support Analyst | IT | 2 | 1237 |
| Bram Wouters | `bram.wouters@sdwise.be` | Senior Payroll Processing Specialist | PRODUCTION | 8 | 1243 |
| Nele Verbruggen | `nele.verbruggen@sdwise.be` | Payroll Operations Coordinator | PRODUCTION | 4 | 1239 |
| Fien Claes | `fien.claes@sdwise.be` | Junior Payroll Support Analyst | IT | 1 | 1236 |
| Annelies Timmermans | `annelies.timmermans@sdwise.be` | Payroll Processing Associate | PRODUCTION | 3 | 1238 |
| Silke Hoefkens | `silke.hoefkens@sdwise.be` | Junior Payroll Audit Analyst | AUDIT | 23 | 1258 |
| Mathieu Van Damme | `mathieu.vandamme@sdwise.be` | Escalation & Compliance Specialist | CUSTOMER_SERVICE | 6 | 1241 |
| Matthias Coppens | `matthias.coppens@sdwise.be` | Payroll Processing Associate | PRODUCTION | 3 | 1238 |
| Hugo De Cock | `hugo.decock@sdwise.be` | Accounts Payable Clerk | FINANCE | 15 | 1250 |
| Ilse Goossens | `ilse.goossens@sdwise.be` | Payroll Processing Specialist | HR | 19 | 1254 |
| Mathieu Dubois | `mathieu.dubois@sdwise.be` | Quality Assurance Reviewer (Payroll) | CUSTOMER_SERVICE | 7 | 1242 |
| Els Coppens | `els.coppens@sdwise.be` | Workforce Data Administrator | PRODUCTION | 7 | 1242 |
| Femke Stevens | `femke.stevens@sdwise.be` | Junior Payroll Support Analyst | IT | 3 | 1238 |
| Lore Peeters | `lore.peeters@sdwise.be` | SOC Analyst | SECURITY | 22 | 1257 |
| Matthias Pauwels | `matthias.pauwels@sdwise.be` | IT Support Technician | IT | 5 | 1240 |
| Niels Leclercq | `niels.leclercq@sdwise.be` | Payroll Operations Manager | IT | 8 | 1243 |
| Silke Lambert | `silke.lambert@sdwise.be` | Business Development Representative | SALES | 4 | 1239 |
| Pascal Thys | `pascal.thys@sdwise.be` | Junior Payroll Audit Analyst | AUDIT | 23 | 1258 |
| Thomas Coppens | `thomas.coppens@sdwise.be` | Senior Payroll Consultant | IT | 2 | 1237 |
| Tim Janssens | `tim.janssens@sdwise.be` | Finance Analyst | FINANCE | 18 | 1253 |
| Arne Declercq | `arne.declercq@sdwise.be` | Workforce Management Specialist | IT | 6 | 1241 |
| Marie De Cock | `marie.decock@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 3 | 1238 |
| Sanne Beckers | `sanne.beckers@sdwise.be` | Payroll Officer | SECRETARIAL | 23 | 1258 |
| Tim De Cock | `tim.decock@sdwise.be` | Payroll Specialist | FINANCE | 16 | 1251 |
| Emma Coppens | `emma.coppens@sdwise.be` | Junior Payroll Accountant | ACCOUNTING | 21 | 1256 |
| Nele Van den Berg | `nele.vandenberg@sdwise.be` | Escalation & Compliance Specialist | CUSTOMER_SERVICE | 3 | 1238 |
| Amélie Dupont | `amelie.dupont@sdwise.be` | Payroll Processing Expert | CUSTOMER_SERVICE | 3 | 1238 |
| Jeroen Dubois | `jeroen.dubois@sdwise.be` | Payroll Processing Associate | PRODUCTION | 2 | 1237 |
| Lars Verhaegen | `lars.verhaegen@sdwise.be` | Payroll Escalation Specialist | PRODUCTION | 2 | 1237 |
| Dries Jacobs | `dries.jacobs@sdwise.be` | Payroll Operations Team Lead | IT | 5 | 1240 |
| Niels Stevens | `niels.stevens@sdwise.be` | IT Support Technician | IT | 6 | 1241 |
| Wim Pauwels | `wim.pauwels@sdwise.be` | Senior Payroll Processing Specialist | PRODUCTION | 2 | 1237 |
| Jan Renard | `jan.renard@sdwise.be` | Payroll Processing Associate | PRODUCTION | 4 | 1239 |
| Jonas Aerts | `jonas.aerts@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 4 | 1239 |
| Marie Van Damme | `marie.vandamme@sdwise.be` | Quality Assurance Analyst – Payroll | PRODUCTION | 4 | 1239 |
| Bart Callens | `bart.callens@sdwise.be` | Senior Payroll Processing Specialist | PRODUCTION | 4 | 1239 |
| Nele Lemmens | `nele.lemmens@sdwise.be` | Payroll Processing Associate | PRODUCTION | 6 | 1241 |
| Silke Renard | `silke.renard@sdwise.be` | Payroll Escalation Specialist | PRODUCTION | 6 | 1241 |
| Koen Wuyts | `koen.wuyts@sdwise.be` | Marketing Specialist | MARKETING | 22 | 1257 |
| Sofie Wuyts | `sofie.wuyts@sdwise.be` | Junior Payroll Consultant | HR | 19 | 1254 |
| Annelies Verhaegen | `annelies.verhaegen@sdwise.be` | Workforce Management Specialist | IT | 9 | 1244 |
| Ilse Heyvaert | `ilse.heyvaert@sdwise.be` | Workforce Data Administrator | PRODUCTION | 5 | 1240 |
| Emma Wuyts | `emma.wuyts@sdwise.be` | Account Manager | SALES | 13 | 1248 |
| Amélie Van den Berg | `amelie.vandenberg@sdwise.be` | Inside Sales Representative | SALES | 15 | 1250 |
| Ilse Lambert | `ilse.lambert@sdwise.be` | Payroll Operations Analyst | CUSTOMER_SERVICE | 4 | 1239 |
| Inge De Backer | `inge.debacker@sdwise.be` | Junior Facilities Maintenance Technician | MAINTENANCE | 22 | 1257 |
| Sara Martens | `sara.martens@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 3 | 1238 |
| Tom Callens | `tom.callens@sdwise.be` | Reception Assistant | RECEPTION | 22 | 1257 |
| Jan Cools | `jan.cools@sdwise.be` | Business Development Representative | SALES | 9 | 1244 |
| Niels Hendrickx | `niels.hendrickx@sdwise.be` | Payroll Operations Analyst | CUSTOMER_SERVICE | 7 | 1242 |
| Thomas Wouters | `thomas.wouters@sdwise.be` | Junior Cleaner | CLEANING | 24 | 1259 |
| Tom Timmermans | `tom.timmermans@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 1 | 1236 |
| Daan De Vos | `daan.devos@sdwise.be` | Junior Payroll Support Analyst | IT | 6 | 1241 |
| Joris Desmet | `joris.desmet@sdwise.be` | Business Development Representative | SALES | 10 | 1245 |
| Tom Vermeulen | `tom.vermeulen@sdwise.be` | Payroll Processing Expert | CUSTOMER_SERVICE | 4 | 1239 |
| Eline Beckers | `eline.beckers@sdwise.be` | Customer Support Representative (Payroll Queries) | CUSTOMER_SERVICE | 3 | 1238 |
| Lore Hendrickx | `lore.hendrickx@sdwise.be` | Payroll Accounting Operator | ACCOUNTING | 19 | 1254 |
| Els Wuyts | `els.wuyts@sdwise.be` | Junior Payroll Support Analyst | IT | 3 | 1238 |
| Ruben Janssens | `ruben.janssens@sdwise.be` | Business Development Representative | SALES | 13 | 1248 |
| Camille Janssens | `camille.janssens@sdwise.be` | Payroll Specialist | FINANCE | 19 | 1254 |
| Inge Goossens | `inge.goossens@sdwise.be` | Payroll Operations Analyst | CUSTOMER_SERVICE | 3 | 1238 |
| Emma Verhaegen | `emma.verhaegen@sdwise.be` | Payroll Specialist | FINANCE | 14 | 1249 |
| Mieke Peeters | `mieke.peeters@sdwise.be` | Payroll Accounting Operator | ACCOUNTING | 18 | 1253 |
| Tom De Backer | `tom.debacker@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 4 | 1239 |
| Yannick Willems | `yannick.willems@sdwise.be` | Team Lead, Payroll Processing | CUSTOMER_SERVICE | 3 | 1238 |
| Katrien Renard | `katrien.renard@sdwise.be` | Payroll Processing Expert | CUSTOMER_SERVICE | 3 | 1238 |
| Camille Renard | `camille.renard@sdwise.be` | Marketing Specialist | MARKETING | 23 | 1258 |
| Eline Wuyts | `eline.wuyts@sdwise.be` | Junior Payroll Processing Specialist | CUSTOMER_SERVICE | 4 | 1239 |
| Dries Dupont | `dries.dupont@sdwise.be` | Payroll Accountant | ACCOUNTING | 20 | 1255 |
