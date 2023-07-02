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
          shop_name: NewMarketplaceDto.shop_name,
          change_key: NewMarketplaceDto.change_key || null,
          stats_key: NewMarketplaceDto.stats_key || null,
          uid: newKeyPairId,
        };
        secret_keysArray.push(new_secret_key);
        await setDoc(
          organizationRef,
          { secret_keys: secret_keysArray },
          { merge: true },
        );

        // Adding shop
        const shopsArray = organizationDoc.data().shops || [];
        const new_shop = {
          shop_name: NewMarketplaceDto.shop_name,
          uid: newKeyPairId,
        };
        shopsArray.push(new_shop);
        await setDoc(organizationRef, { shops: shopsArray }, { merge: true });
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

  // TODO: add user to organization
  async addUserToOrganization(AddUserDto: AddUserDto) {
    this.firebaseAdminService
      .getAdminAuth()
      .getUserByEmail(AddUserDto.userToAdd)
      .then((userRecord) => {
        // User found
        console.log('Successfully fetched user data:', userRecord.toJSON());
      })
      .catch((error) => {
        // Error fetching user
        console.error('Error fetching user data:', error);
      });
  }
}
