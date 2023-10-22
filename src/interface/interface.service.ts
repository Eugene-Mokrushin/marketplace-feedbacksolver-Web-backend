import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NewMarketplaceDto, AddUserDto, NewKeyPairDto } from './interfaceDto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseAdminService } from '@/firebase/firebase.admin.service';
import { SharedService } from '@/shared/shared.service';

@Injectable()
export class InterfaceService {
  constructor(
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private firebaseAdminService: FirebaseAdminService,
    private sharedService: SharedService,
  ) {}

  async addNewMarketplace(NewMarketplaceDto: NewMarketplaceDto) {
    try {
      const randomUUID = this.firebaseAdminService
        .getAdminFirestore()
        .collection('marketplaces')
        .doc().id;
      if (NewMarketplaceDto.default) {
        const marketplacesRef = this.firebaseAdminService
          .getAdminFirestore()
          .collection('marketplaces')
          .where('organizationId', '==', NewMarketplaceDto.organizationId)
          .where('default', '==', true);
        const marketplacesSnapshot = await marketplacesRef.get();
        marketplacesSnapshot.forEach((doc) => {
          doc.ref.update({ default: false });
        });
      }
      await setDoc(
        doc(this.firebaseService.getFirestore(), 'marketplaces', randomUUID),
        {
          mainKey: this.sharedService.encodeSecretKey(
            NewMarketplaceDto.mainKey.trim(),
          ),
          analyticsKey: this.sharedService.encodeSecretKey(
            NewMarketplaceDto.analyticsKey.trim(),
          ),
          id: randomUUID,
          name: NewMarketplaceDto.name,
          type: NewMarketplaceDto.type,
          default: NewMarketplaceDto.default
            ? NewMarketplaceDto.default
            : false,
          organizationId: NewMarketplaceDto.organizationId,
        },
      );
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to assign new keypair ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getMarketplaces(organizationId: string) {
    this.logger.log(`Getting marketplaces for organization ${organizationId}`);
    try {
      const marketplacesRef = this.firebaseAdminService
        .getAdminFirestore()
        .collection('marketplaces')
        .where('organizationId', '==', organizationId);
      const marketplacesSnapshot = await marketplacesRef.get();
      const marketplacesArray = [];
      marketplacesSnapshot.forEach((doc) => {
        const docData = doc.data();
        marketplacesArray.push({
          type: docData.type,
          name: docData.name,
          id: docData.id,
          default: docData.default,
        });
      });
      return marketplacesArray;
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to get marketplaces ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async changeMarketplaceKey(NewKeyPairDto: NewKeyPairDto) {
    try {
      const marketplaceRef = doc(
        this.firebaseService.getFirestore(),
        'marketplaces',
        NewKeyPairDto.id,
      );
      const marketplaceDoc = await getDoc(marketplaceRef);
      if (marketplaceDoc.exists()) {
        const marketplaceData = marketplaceDoc.data();
        if (marketplaceData.organizationId !== NewKeyPairDto.organizationId) {
          throw new HttpException(
            'You dont have permissions to change this key',
            HttpStatus.UNAUTHORIZED,
          );
        }
        const updateData: {
          mainKey?: string;
          analyticsKey?: string;
          default?: boolean;
        } = {};
        if (NewKeyPairDto.default) {
          const marketplacesRef = this.firebaseAdminService
            .getAdminFirestore()
            .collection('marketplaces')
            .where('organizationId', '==', NewKeyPairDto.organizationId)
            .where('default', '==', true);
          const marketplacesSnapshot = await marketplacesRef.get();
          marketplacesSnapshot.forEach((doc) => {
            doc.ref.update({ default: false });
          });
        }
        if (NewKeyPairDto.mainKey) {
          updateData.mainKey = this.sharedService.encodeSecretKey(
            NewKeyPairDto.mainKey,
          );
        }
        if (NewKeyPairDto.analyticsKey) {
          updateData.analyticsKey = this.sharedService.encodeSecretKey(
            NewKeyPairDto.analyticsKey,
          );
        }
        if (NewKeyPairDto.default) {
          updateData.default = NewKeyPairDto.default;
        }
        await setDoc(marketplaceRef, updateData, { merge: true });
      }
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to change marketplace key ${errorCode}. Message: ${errorMessage}`,
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
