import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../../test/utils/test-utils";
import {Connection} from "../../../src";
import {Simple} from "./entity/Simple";
import {Complex} from "./entity/Complex";

describe("github issues > #2103 query builder regression", () => {

    let connections: Connection[];
    beforeAll(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchema: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    afterAll(() => closeTestingConnections(connections));

    test("whereInIds should respect logical operator precedence > single simple primary key (in is used)", () => Promise.all(connections.map(async connection => {
        const repository = connection.getRepository(Simple);

        const savedEntities = await repository.save([
            repository.create({ x: 1 }),
            repository.create({ x: 2 }),
            repository.create({ x: 1 }),
            repository.create({ x: 3 })
        ]);

        expect(savedEntities.length).toEqual(4); // check if they all are saved

        const ids = savedEntities.map(entity => entity.id);

        const entities = await repository.createQueryBuilder("s")
            .whereInIds(ids)
            .andWhere("x = 1")
            .getMany();

        expect(entities.map(entity => entity.id)).toEqual(
            savedEntities
                .filter(entity => entity.x === 1)
                .map(entity => entity.id)
        );
    })));

    test("whereInIds should respect logical operator precedence > multiple primary keys", () => Promise.all(connections.map(async connection => {
        const repository = connection.getRepository(Complex);

        // sqlite does not support autoincrement for composite primary key, so we pass ids by ourselves here
        const savedEntities = await repository.save([
            repository.create({ id: 1, code: 1, x: 1 }),
            repository.create({ id: 2, code: 1, x: 2 }),
            repository.create({ id: 3, code: 1, x: 1 }),
            repository.create({ id: 4, code: 1, x: 3 })
        ]);

        expect(savedEntities.length).toEqual(4); // check if they all are saved

        const ids = savedEntities.map(entity => entity.id);

        const entities = await repository.createQueryBuilder("s")
            .whereInIds(ids.map(id => {
                return { id, code: 1 };
            }))
            .andWhere("x = 1")
            .getMany();

        expect(entities.map(entity => entity.id)).toEqual(
            savedEntities
                .filter(entity => entity.x === 1)
                .map(entity => entity.id)
        );
    })));

});