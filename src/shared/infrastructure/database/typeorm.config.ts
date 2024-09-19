import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { join } from "path";

export const getTypeOrmConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const dbName = configService.get("DB_DATABASE");

  const baseConfig: TypeOrmModuleOptions = {
    type: "postgres",
    host: configService.get("DB_HOST"),
    port: configService.get<number>("DB_PORT"),
    username: configService.get("DB_USERNAME"),
    password: configService.get("DB_PASSWORD"),
    database: "postgres", // 기본 데이터베이스에 연결
    entities: [join(__dirname, "..", "..", "**", "*.entity.{ts,js}")],
    synchronize: true,
  };
  return baseConfig;
};
//   // 데이터베이스 존재 여부 확인 및 생성
//   const { Client } = require("pg");
//   const client = new Client({
//     ...baseConfig,
//     database: "postgres", // 기본 데이터베이스에 연결
//   });

//   try {
//     await client.connect();
//     const result = await client.query(
//       `SELECT 1 FROM pg_database WHERE datname='${dbName}'`,
//     );
//     if (result.rows.length === 0) {
//       await client.query(`CREATE DATABASE "${dbName}"`);
//       console.log(`Database ${dbName} created.`);
//     }
//   } catch (error) {
//     console.error("Error checking/creating database:", error);
//   } finally {
//     await client.end();
//   }

//   return {
//     ...baseConfig,
//     database: dbName,
//   };
// };
