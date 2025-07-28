import { Module } from "nject-ts";
import { AppService } from "./app.service";
import { CoreModule } from "./core/core.module";
import { UserModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RoleModule } from "./modules/role/role.module";
import { ProductModule } from "./modules/product/product.module";
import { FileModule } from "./modules/file/file.module";

@Module({
  imports: [
    CoreModule,
    RoleModule,
    UserModule,
    AuthModule,
    ProductModule,
    FileModule,
  ],
  providers: [AppService],
  exports: [AppService]
})
export class AppModule {}