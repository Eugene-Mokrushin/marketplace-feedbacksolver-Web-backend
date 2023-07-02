import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NewMarketplaceDto, AddUserDto } from './interfaceDto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseAdminService } from '@/firebase/firebase.admin.service';

@Injectable()
export class InterfaceService {
  constructor(
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private firebaseAdminService: FirebaseAdminService,
  ) {}

  async addNewMarketplace(NewMarketplaceDto: NewMarketplaceDto) {
    try {
      const organizationRef = doc(
        this.firebaseService.getFirestore(),
        'organizations',
        NewMarketplaceDto.organizationId,
      );
      const newKeyPairId = uuidv4();
      const organizationDoc = await getDoc(organizationRef);
      if (organizationDoc.exists()) {
        // Adding keys
        const secret_keysArray = organizationDoc.data().secret_keys || [];
        const new_secret_key = {
          change_key: NewMarketplaceDto.change_key || null,
          stats_key: NewMarketplaceDto.stats_key || null,
          uid: newKeyPairId,
        };
        secret_keysArray.push(new_secret_key);
        await setDoc(organizationRef, {}, { merge: true });

        // Adding shop
        const shopsArray = organizationDoc.data().shops || [];
        const new_shop = {
          shop_name: NewMarketplaceDto.shop_name,
          marketplace: NewMarketplaceDto.marketplace,
          uid: newKeyPairId,
        };
        shopsArray.push(new_shop);
        await setDoc(
          organizationRef,
          { shops: shopsArray, secret_keys: secret_keysArray },
          { merge: true },
        );
      } else {
        throw new HttpException(
          'No such organization was found',
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to assign new keypair ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addUserToOrganization(AddUserDto: AddUserDto) {
    interface UserInterface {
      userId: string;
      role: string;
    }

    try {
      const found_user = await this.firebaseAdminService
        .getAdminAuth()
        .getUserByEmail(AddUserDto.userToAdd);
      const organizationRef = doc(
        this.firebaseService.getFirestore(),
        'organizations',
        AddUserDto.organizationId,
      );
      const usersRef = doc(
        this.firebaseService.getFirestore(),
        'users',
        found_user.uid,
      );
      const organizationDoc = await getDoc(organizationRef);
      const usersDoc = await getDoc(usersRef);
      if (organizationDoc.exists() && usersDoc.exists()) {
        // Verify the user has rights to add another user
        const usersArray =
          (organizationDoc.data().users as UserInterface[]) || [];
        const userSetter: UserInterface = usersArray.find((user) => {
          if (user.userId === AddUserDto.userSetter) {
            return user;
          } else {
            return null;
          }
        });
        if (userSetter && userSetter.role !== 'admin') {
          throw new HttpException(
            "You don't have permissions",
            HttpStatus.UNAUTHORIZED,
          );
        }
        // Add user to organization
        const new_user = {
          userId: found_user.uid,
          role: AddUserDto.role,
        };
        usersArray.push(new_user);
        await setDoc(organizationRef, { users: usersArray }, { merge: true });

        // Assign organization to the user
        const organizationsArray = usersDoc.data().organizations || [];
        organizationsArray.push(AddUserDto.organizationId);
        await setDoc(
          usersRef,
          { organizations: organizationsArray },
          { merge: true },
        );
      }
    } catch (error) {
      const errorCode =
        error.errorInfo?.code === 'auth/user-not-found'
          ? HttpStatus.NOT_FOUND
          : error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to assign new user - ${AddUserDto.userToAdd} to organization - ${AddUserDto.organizationId}. ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, errorCode);
    }
  }
}
